// Trust Labs App — receives Paymob's "transaction processed" callback and
// marks the booking paid/failed/refunded.
//
// This is the source of truth for payment status (the browser redirect back to
// the site is only UX and can be forged by the patient).
//
// Paymob cannot send a Supabase JWT, so deploy WITHOUT JWT verification — the
// HMAC signature below is what authenticates the caller:
//   supabase functions deploy paymob-webhook --no-verify-jwt
// Secrets:
//   PAYMOB_HMAC_SECRET — "HMAC secret" from the Paymob dashboard
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — provided automatically
//
// Response policy: 401 only for a bad signature. Anything Paymob legitimately
// signed gets 200 even when we ignore it, so Paymob doesn't retry forever; the
// reason is in the function logs.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { computePaymobHmac, timingSafeEqual } from '../_shared/paymobHmac.ts'

const HMAC_SECRET = Deno.env.get('PAYMOB_HMAC_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405)

  try {
    if (!HMAC_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing PAYMOB_HMAC_SECRET or Supabase env vars')
    }

    const payload = await req.json().catch(() => null)
    const obj = payload?.obj
    // Card-token and other callback types use a different HMAC recipe — we don't enable them.
    if (payload?.type !== 'TRANSACTION' || !obj) {
      console.log('Ignored non-transaction callback', { type: payload?.type, keys: Object.keys(payload ?? {}) })
      return reply({ ignored: 'not_a_transaction' })
    }

    const received = new URL(req.url).searchParams.get('hmac')?.toLowerCase() ?? ''
    const expected = await computePaymobHmac(obj, HMAC_SECRET)
    if (!received || !timingSafeEqual(received, expected)) {
      console.error('Rejected callback with invalid HMAC')
      return reply({ error: 'invalid_hmac' }, 401)
    }

    // Correlate by Paymob's own order id: it is part of the signed fields, so it cannot be
    // swapped in a replayed callback (merchant_order_id is NOT signed). The merchant
    // reference is only a fallback for payments created before paymob_order_id was stored.
    const orderId = obj.order?.id
    const ref = obj.order?.merchant_order_id ?? obj.merchant_order_id
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const columns = 'booking_ref, amount_cents, currency, status, paymob_transaction_id'

    // deno-lint-ignore no-explicit-any
    let payment: any = null
    if (orderId) {
      const { data, error } = await db.from('payments').select(columns).eq('paymob_order_id', orderId).maybeSingle()
      if (error) throw error
      payment = data
    }
    if (!payment && ref) {
      const { data, error } = await db.from('payments').select(columns).eq('booking_ref', String(ref)).maybeSingle()
      if (error) throw error
      payment = data
    }
    if (!payment) {
      console.error('Signed callback we cannot match to a payment', { transaction: obj.id, orderId, hasRef: !!ref })
      return reply({ ignored: 'unknown_booking' })
    }

    // The amount is signed too, and the transaction id below can only ever be
    // attached to one booking.
    if (Number(obj.amount_cents) !== payment.amount_cents || obj.currency !== payment.currency) {
      console.error('Amount/currency mismatch', { ref, got: obj.amount_cents, expected: payment.amount_cents })
      return reply({ ignored: 'amount_mismatch' })
    }

    let next: 'paid' | 'failed' | 'refunded' | 'voided' | null = null
    const isOurTransaction =
      payment.paymob_transaction_id !== null &&
      (Number(obj.id) === Number(payment.paymob_transaction_id) || Number(obj.parent_transaction) === Number(payment.paymob_transaction_id))

    if (obj.is_refunded && isOurTransaction) next = 'refunded'
    else if (obj.is_voided && isOurTransaction) next = 'voided'
    else if (obj.success === true && obj.pending === false && obj.error_occured === false && !obj.is_refunded && !obj.is_voided) next = 'paid'
    else if (obj.success === false && obj.pending === false) next = 'failed'
    if (!next) {
      console.log('Callback caused no state change', {
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

    return reply({ ok: true, status: next })
  } catch (err) {
    // 500 makes Paymob retry, which is what we want for a transient DB error.
    console.error(err)
    return reply({ error: 'internal_error' }, 500)
  }
})
