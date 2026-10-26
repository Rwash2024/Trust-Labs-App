// Trust Labs App — starts a Paymob card payment for an existing booking.
//
// Called from the browser after the booking row has been saved. The browser
// only says WHICH booking and WHICH items; the amount is computed here from the
// prices in the database. The `total` stored on the booking by the client is
// never used — the public anon key can insert any value into it.
//
// Flow: validate booking -> price the items -> record the expected amount in
// `payments` -> Create Intention at Paymob -> return the Unified Checkout URL.
// The result of the payment arrives later at paymob-webhook.
//
// Deploy: supabase functions deploy create-paymob-payment
// Secrets (Project Settings > Edge Functions > Secrets):
//   PAYMOB_SECRET_KEY      — "sk_live_…" / "sk_test_…" from the Paymob dashboard
//   PAYMOB_PUBLIC_KEY      — "pk_live_…" / "pk_test_…"
//   PAYMOB_INTEGRATION_ID  — numeric id of the Online Card integration
//   APP_URL                — public site URL, no trailing slash (patient returns here)
//   HOME_VISIT_FEE         — optional, defaults to 75 (must match brand.homeVisitFee)
//   PAYMOB_API_BASE        — optional, defaults to https://accept.paymob.com
//   PAYMOB_CHECKOUT_BASE   — optional, defaults to https://eg.checkout.paymob.com
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — provided automatically

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SECRET_KEY = Deno.env.get('PAYMOB_SECRET_KEY')
const PUBLIC_KEY = Deno.env.get('PAYMOB_PUBLIC_KEY')
// One id in normal use. A comma-separated list is tried in order while finding out which of
// an account's integrations Paymob's Intention API accepts; the winner is logged. Cut the
// secret down to that single id afterwards.
const INTEGRATION_IDS = (Deno.env.get('PAYMOB_INTEGRATION_ID') ?? '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0)
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
const HOME_VISIT_FEE = Number(Deno.env.get('HOME_VISIT_FEE') ?? 75)
const API_BASE = Deno.env.get('PAYMOB_API_BASE') ?? 'https://accept.paymob.com'
const CHECKOUT_BASE = Deno.env.get('PAYMOB_CHECKOUT_BASE') ?? 'https://eg.checkout.paymob.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// A booking can only be paid for shortly after it was made.
const MAX_BOOKING_AGE_MS = 2 * 60 * 60 * 1000

function maskKey(key: string | undefined): string {
  return key ? key.replace(/[^_]+$/, '***') : 'unset'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    if (!SECRET_KEY || !PUBLIC_KEY || !INTEGRATION_IDS.length || !APP_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Paymob/Supabase configuration (see the header of this file)')
    }

    const { bookingRef, phone, itemIds } = await req.json()
    if (
      typeof bookingRef !== 'string' ||
      typeof phone !== 'string' ||
      !Array.isArray(itemIds) ||
      itemIds.length === 0 ||
      itemIds.length > 40 ||
      !itemIds.every((id) => typeof id === 'string' && id.length <= 120)
    ) {
      return json({ error: 'bad_request' }, 400)
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. The booking must exist, belong to this phone, and be awaiting online payment.
    const { data: booking, error: bookingErr } = await db
      .from('bookings')
      .select('booking_ref, mode, name, phone, payment_status, created_at')
      .eq('booking_ref', bookingRef)
      .maybeSingle()
    if (bookingErr) throw bookingErr
    if (!booking || booking.phone !== phone) return json({ error: 'booking_not_found' }, 404)
    if (booking.payment_status !== 'pending') return json({ error: 'not_payable', status: booking.payment_status }, 409)
    if (Date.now() - new Date(booking.created_at).getTime() > MAX_BOOKING_AGE_MS) return json({ error: 'booking_expired' }, 409)

    // 2. Price the cart from the database. Cart ids are `test-<code>` for single
    //    tests and the package id otherwise (see Booking.jsx testToCartItem).
    const uniqueIds = [...new Set(itemIds as string[])]
    const testCodes = uniqueIds.filter((id) => id.startsWith('test-')).map((id) => id.slice(5))
    const packageIds = uniqueIds.filter((id) => !id.startsWith('test-'))

    const lines: { name: string; price: number }[] = []
    if (testCodes.length) {
      const { data, error } = await db.from('tests').select('code, name, price').in('code', testCodes)
      if (error) throw error
      if ((data?.length ?? 0) !== testCodes.length) return json({ error: 'unknown_item' }, 400)
      lines.push(...data!.map((t) => ({ name: t.name as string, price: Number(t.price) })))
    }
    if (packageIds.length) {
      const { data, error } = await db.from('packages').select('id, name, price').in('id', packageIds)
      if (error) throw error
      if ((data?.length ?? 0) !== packageIds.length) return json({ error: 'unknown_item' }, 400)
      lines.push(...data!.map((p) => ({ name: p.name as string, price: Number(p.price) })))
    }
    if (lines.some((l) => !Number.isFinite(l.price) || l.price <= 0)) return json({ error: 'unpriced_item' }, 400)

    // The launch-offer waiver is recorded server-side by redeem_launch_offer(),
    // so look it up rather than believing bookings.launch_offer_applied.
    let homeFee = 0
    if (booking.mode === 'home') {
      const { data: redemption, error } = await db
        .from('launch_offer_redemptions')
        .select('id')
        .eq('phone', booking.phone)
        .eq('booking_ref', booking.booking_ref)
        .maybeSingle()
      if (error) throw error
      homeFee = redemption ? 0 : HOME_VISIT_FEE
    }

    const subtotal = lines.reduce((sum, l) => sum + l.price, 0)
    const total = subtotal + homeFee
    const amountCents = Math.round(total * 100)

    // 3. Never create a second charge for a booking that is already paid.
    const { data: existing, error: existingErr } = await db
      .from('payments')
      .select('status')
      .eq('booking_ref', booking.booking_ref)
      .maybeSingle()
    if (existingErr) throw existingErr
    if (existing && existing.status !== 'pending' && existing.status !== 'failed') {
      return json({ error: 'not_payable', status: existing.status }, 409)
    }

    // 4. Create the intention at Paymob.
    const items = [
      ...lines.map((l) => ({ name: l.name.slice(0, 120), amount: Math.round(l.price * 100), description: l.name.slice(0, 120), quantity: 1 })),
      ...(homeFee > 0 ? [{ name: 'Home visit', amount: Math.round(homeFee * 100), description: 'Home visit fee', quantity: 1 }] : []),
    ]
    const [firstName, ...rest] = String(booking.name).trim().split(/\s+/)

    const requestBody = {
      amount: amountCents,
      currency: 'EGP',
      items,
      billing_data: {
        first_name: firstName || 'NA',
        last_name: rest.join(' ') || 'NA',
        phone_number: `+2${booking.phone}`,
        email: Deno.env.get('PAYMOB_BILLING_EMAIL') ?? 'na@example.com',
        apartment: 'NA',
        floor: 'NA',
        building: 'NA',
        street: 'NA',
        city: 'NA',
        state: 'NA',
        country: 'EG',
      },
      special_reference: booking.booking_ref,
      expiration: 3600,
      notification_url: `${SUPABASE_URL}/functions/v1/paymob-webhook`,
      redirection_url: `${APP_URL}/payment-result`,
    }

    // deno-lint-ignore no-explicit-any
    let intention: any = null
    for (const integrationId of INTEGRATION_IDS) {
      const res = await fetch(`${API_BASE}/v1/intention/`, {
        method: 'POST',
        headers: { Authorization: `Token ${SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...requestBody, payment_methods: [integrationId] }),
      })
      const body = await res.json().catch(() => null)
      if (res.ok && body?.client_secret) {
        intention = body
        console.log(`Paymob intention created with integration=${integrationId}`)
        break
      }
      // The response can echo the request, so never log the body. Log the status, the keys,
      // and only Paymob's own short error message (`detail`) — enough to diagnose a
      // wrong integration id / key mix-up without leaking billing data.
      console.error(
        'Paymob create-intention failed',
        res.status,
        body ? Object.keys(body) : 'non-JSON body',
        typeof body?.detail === 'string' ? body.detail.slice(0, 200) : '',
        `integration=${integrationId}`,
        // Key *shape* only (e.g. "egy_sk_test_***"): the random tail is masked.
        `keys=${maskKey(SECRET_KEY)} ${maskKey(PUBLIC_KEY)}`,
      )
      // Only an unknown integration id is worth trying the next id for; anything else
      // (bad key, bad amount, Paymob down) would fail the same way for every id.
      if (res.status !== 404) break
    }
    if (!intention) return json({ error: 'payment_provider_error' }, 502)

    // 5. Record what the webhook must later see, and correct the booking's money fields.
    const { error: upsertErr } = await db.from('payments').upsert(
      {
        booking_ref: booking.booking_ref,
        amount_cents: amountCents,
        currency: 'EGP',
        intention_id: intention.id ? String(intention.id) : null,
        // Paymob's order id: the (signed) key the webhook uses to find this payment again.
        paymob_order_id: intention.intention_order_id ?? null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'booking_ref' },
    )
    if (upsertErr) throw upsertErr

    const { error: bookingUpdateErr } = await db
      .from('bookings')
      .update({ subtotal, home_visit_fee: homeFee, total })
      .eq('booking_ref', booking.booking_ref)
    if (bookingUpdateErr) console.error('Could not sync booking totals (non-blocking)', bookingUpdateErr)

    const checkoutUrl = `${CHECKOUT_BASE}/?publicKey=${encodeURIComponent(PUBLIC_KEY)}&clientSecret=${encodeURIComponent(intention.client_secret)}`
    return json({ checkoutUrl })
  } catch (err) {
    console.error(err)
    return json({ error: 'internal_error' }, 500)
  }
})
