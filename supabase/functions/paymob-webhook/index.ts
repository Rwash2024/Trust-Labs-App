// Trust Labs App — receives Paymob's payment callbacks and marks the booking
// paid/failed/refunded.
//
// This is the source of truth for payment status (the browser redirect back to
// the site is only UX and can be forged by the patient).
//
// Paymob cannot send a Supabase JWT, so deploy WITHOUT JWT verification — what
// authenticates a callback is checked below, never the caller's headers:
//   supabase functions deploy paymob-webhook --no-verify-jwt
//
// Two callback shapes exist and are both handled:
//  A. Classic "transaction processed": { type: "TRANSACTION", obj: {...} } with the
//     HMAC in the `hmac` query parameter. Verified with HMAC-SHA512.
//  B. Intention API callback: { paymob_request_id, intention, transaction, hmac,
//     partner_digest }. Its signature recipe is not published, so the body is NOT
//     trusted: we use only its transaction id, ask Paymob's Transaction Inquiry API
//     (over TLS, authenticated with our API key) for the real transaction, and act on
//     that answer. That one is what the test payments actually deliver.
//
// Secrets:
//   PAYMOB_API_KEY     — "API key" card in Paymob Settings → API Keys (shape B)
//   PAYMOB_HMAC_SECRET — "HMAC" card in the same page (shape A)
//   PAYMOB_API_BASE    — optional, defaults to https://accept.paymob.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — provided automatically
//
// Response policy: 401 only for a bad signature on shape A. A callback we choose to
// ignore gets 200 (so Paymob doesn't retry forever) with the reason in the logs; a
// transient failure gets 500 so Paymob retries.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { computePaymobHmac, timingSafeEqual } from '../_shared/paymobHmac.ts'

const HMAC_SECRET = Deno.env.get('PAYMOB_HMAC_SECRET')
const API_KEY = Deno.env.get('PAYMOB_API_KEY')
const API_BASE = Deno.env.get('PAYMOB_API_BASE') ?? 'https://accept.paymob.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// Asks Paymob what really happened to a transaction. Returns null on any failure so the
// caller can answer 500 and let Paymob retry.
// deno-lint-ignore no-explicit-any
async function inquireTransaction(transactionId: unknown): Promise<any | null> {
  const authRes = await fetch(`${API_BASE}/api/auth/tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
  })
  const auth = await authRes.json().catch(() => null)
  if (!authRes.ok || !auth?.token) {
    console.error('Paymob auth token request failed', authRes.status)
    return null
  }
  const res = await fetch(`${API_BASE}/api/acceptance/transactions/${encodeURIComponent(String(transactionId))}`, {
    headers: { Authorization: `Bearer ${auth.token}` },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body) {
    console.error('Paymob transaction inquiry failed', res.status)
    return null
  }
  return body
}

// Applies a trustworthy transaction object (HMAC-verified or fetched from Paymob) to the
// payment it belongs to. `allowReferenceFallback` is only for shape A, where the booking
// reference may stand in for an order id we never stored.
// deno-lint-ignore no-explicit-any
async function settle(db: SupabaseClient, obj: any, allowReferenceFallback: boolean): Promise<Response> {
  // Correlate by Paymob's own order id. It is a signed/fetched value, so it cannot be
  // swapped in a replayed callback (merchant_order_id is NOT signed in shape A).
  const orderId = obj.order?.id
  const ref = obj.order?.merchant_order_id ?? obj.merchant_order_id
  const columns = 'booking_ref, amount_cents, currency, status, paymob_transaction_id'

  // deno-lint-ignore no-explicit-any
  let payment: any = null
  if (orderId) {
    const { data, error } = await db.from('payments').select(columns).eq('paymob_order_id', orderId).maybeSingle()
    if (error) throw error
    payment = data
  }
  if (!payment && allowReferenceFallback && ref) {
    const { data, error } = await db.from('payments').select(columns).eq('booking_ref', String(ref)).maybeSingle()
    if (error) throw error
    payment = data
  }
  if (!payment) {
    console.error('Transaction cannot be matched to a payment', { transaction: obj.id, orderId, hasRef: !!ref })
    return reply({ ignored: 'unknown_booking' })
  }

  // The amount must be exactly what this server computed when it created the payment.
  if (Number(obj.amount_cents) !== payment.amount_cents || obj.currency !== payment.currency) {
    console.error('Amount/currency mismatch', { booking: payment.booking_ref, got: obj.amount_cents, expected: payment.amount_cents })
    return reply({ ignored: 'amount_mismatch' })
  }

  let next: 'paid' | 'failed' | 'refunded' | 'voided' | null = null
  const isOurTransaction =
    payment.paymob_transaction_id !== null &&
    (Number(obj.id) === Number(payment.paymob_transaction_id) || Number(obj.parent_transaction) === Number(payment.paymob_transaction_id))

  if (obj.is_refunded && isOurTransaction) next = 'refunded'
  else if (obj.is_voided && isOurTransaction) next = 'voided'
  else if (obj.success === true && obj.pending !== true && obj.error_occured !== true && !obj.is_refunded && !obj.is_voided) next = 'paid'
  else if (obj.success === false && obj.pending !== true) next = 'failed'
  if (!next) {
    console.log('Transaction caused no state change', {
      transaction: obj.id,
      success: obj.success,
      pending: obj.pending,
      error_occured: obj.error_occured,
      is_refunded: obj.is_refunded,
      is_voided: obj.is_voided,
      current: payment.status,
    })
    return reply({ ignored: 'no_state_change' })
  }

  const now = new Date().toISOString()
  if (next === 'paid') {
    // Only a pending/failed payment can become paid; a second delivery of the
    // same callback finds nothing to update and is a harmless no-op.
    const { data: updated, error: payErr } = await db
      .from('payments')
      .update({ status: 'paid', paymob_transaction_id: obj.id, paid_at: now, updated_at: now })
      .eq('booking_ref', payment.booking_ref)
      .in('status', ['pending', 'failed'])
      .select('booking_ref')
    if (payErr) {
      // 23505 = this transaction id is already attached to another booking.
      console.error('Could not mark payment paid', payErr)
      return reply({ ignored: 'transaction_already_used' })
    }
    if (!updated?.length) return reply({ ignored: 'already_processed' })
  } else if (next === 'failed') {
    // Never downgrade a paid payment because a retry attempt failed afterwards.
    const { data: updated, error: payErr } = await db
      .from('payments')
      .update({ status: 'failed', updated_at: now })
      .eq('booking_ref', payment.booking_ref)
      .in('status', ['pending', 'failed'])
      .select('booking_ref')
    if (payErr) throw payErr
    if (!updated?.length) return reply({ ignored: 'already_processed' })
  } else {
    const { error: payErr } = await db
      .from('payments')
      .update({ status: next, updated_at: now })
      .eq('booking_ref', payment.booking_ref)
      .eq('status', 'paid')
    if (payErr) throw payErr
  }

  const { error: bookingErr } = await db.from('bookings').update({ payment_status: next }).eq('booking_ref', payment.booking_ref)
  if (bookingErr) throw bookingErr

  console.log('Payment settled', { booking: payment.booking_ref, status: next })
  return reply({ ok: true, status: next })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars')

    const payload = await req.json().catch(() => null)
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Shape A: classic transaction-processed callback, authenticated by its HMAC.
    if (payload?.type === 'TRANSACTION' && payload.obj) {
      if (!HMAC_SECRET) throw new Error('Missing PAYMOB_HMAC_SECRET')
      const received = new URL(req.url).searchParams.get('hmac')?.toLowerCase() ?? ''
      const expected = await computePaymobHmac(payload.obj, HMAC_SECRET)
      if (!received || !timingSafeEqual(received, expected)) {
        console.error('Rejected callback with invalid HMAC')
        return reply({ error: 'invalid_hmac' }, 401)
      }
      return await settle(db, payload.obj, true)
    }

    // Shape B: Intention API callback. Do not believe the body; ask Paymob.
    if (payload?.transaction && payload?.intention) {
      if (!API_KEY) throw new Error('Missing PAYMOB_API_KEY')
      const transactionId = payload.transaction.id
      if (!transactionId) {
        console.log('Intention callback without a transaction id', { transactionKeys: Object.keys(payload.transaction) })
        return reply({ ignored: 'no_transaction_id' })
      }

      // Cheap guard against someone POSTing junk to make us call Paymob: if the body names an
      // order id, it must be one we created a payment for. (The body is unauthenticated, so this
      // is only a pre-filter; the inquiry result below is what is actually trusted.) If we can't
      // find any order id in it, fail open and log the shape so this guard can be tightened.
      const claimedOrderIds = [payload.transaction?.order?.id, payload.transaction?.order_id, payload.intention?.intention_order_id]
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
      if (claimedOrderIds.length) {
        const { data: known, error: knownErr } = await db.from('payments').select('booking_ref').in('paymob_order_id', claimedOrderIds).limit(1)
        if (knownErr) throw knownErr
        if (!known?.length) {
          console.error('Intention callback for an order we have no payment for', { transaction: transactionId, claimedOrderIds })
          return reply({ ignored: 'unknown_order' })
        }
      } else {
        console.log('Intention callback without a recognisable order id', {
          transactionKeys: Object.keys(payload.transaction),
          intentionKeys: Object.keys(payload.intention),
        })
      }

      const transaction = await inquireTransaction(transactionId)
      if (!transaction) return reply({ error: 'inquiry_failed' }, 500)
      return await settle(db, transaction, false)
    }

    console.log('Ignored callback of unknown shape', { keys: Object.keys(payload ?? {}) })
    return reply({ ignored: 'unknown_shape' })
  } catch (err) {
    // 500 makes Paymob retry, which is what we want for a transient DB/network error.
    console.error(err)
    return reply({ error: 'internal_error' }, 500)
  }
})
