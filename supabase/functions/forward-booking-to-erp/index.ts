// Trust Labs App — forwards new bookings to Trust Lab Ops (the internal ERP)
// so their side has a record and can eventually send the patient a survey link.
//
// Trigger: a Supabase Database Webhook on the `bookings` table (INSERT),
// configured in the dashboard — see supabase/DATABASE_WEBHOOK_SETUP.md.
// Not called from the browser and not called directly by patients: the
// x-webhook-secret Trust Lab Ops needs never reaches the client.
//
// Deploy: supabase functions deploy forward-booking-to-erp
// Requires secrets (Project Settings > Edge Functions > Secrets):
//   TRUST_LAB_OPS_WEBHOOK_URL     — https://udcfckeolxnvtdwcupyo.supabase.co/functions/v1/receive-booking-webhook
//   TRUST_LAB_OPS_WEBHOOK_SECRET  — the x-webhook-secret value Trust Lab Ops gave us
//   FORWARD_WEBHOOK_SECRET        — our own secret; the Database Webhook must send it
//                                   back as x-forward-secret, so random internet callers
//                                   can't trigger a forward by hitting this URL directly
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — to mark the booking as synced afterwards

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forward-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FORWARD_WEBHOOK_SECRET = Deno.env.get('FORWARD_WEBHOOK_SECRET')
const TRUST_LAB_OPS_WEBHOOK_URL = Deno.env.get('TRUST_LAB_OPS_WEBHOOK_URL')
const TRUST_LAB_OPS_WEBHOOK_SECRET = Deno.env.get('TRUST_LAB_OPS_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

// mode -> the wording Trust Lab Ops's service_type expects. Adjust here if
// they tell us they need a different value (e.g. English 'home'/'branch').
const SERVICE_TYPE = { home: 'زيارة منزلية', branch: 'حجز فرع' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!FORWARD_WEBHOOK_SECRET || req.headers.get('x-forward-secret') !== FORWARD_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS_HEADERS })
    }
    if (!TRUST_LAB_OPS_WEBHOOK_URL || !TRUST_LAB_OPS_WEBHOOK_SECRET) {
      throw new Error('Missing TRUST_LAB_OPS_WEBHOOK_URL or TRUST_LAB_OPS_WEBHOOK_SECRET env vars')
    }

    const payload = await req.json()
    const record = payload?.record
    if (!record || payload.type !== 'INSERT') {
      // Not a booking insert (could be a misconfigured webhook, or a retry with an
      // unexpected shape) — acknowledge without forwarding anything.
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } })
    }

    const body = {
      customer_name: record.name,
      service_type: SERVICE_TYPE[record.mode] || record.mode,
      phone: record.phone,
      branch_name: record.mode === 'branch' ? record.branch_name : null,
      visit_date: record.preferred_date,
      id: record.booking_ref,
    }

    // Dry-run: shows exactly what would be sent, without calling Trust Lab Ops at all.
    // Useful for checking the field mapping after a schema change on either side.
    if (req.headers.get('x-dry-run') === '1') {
      return new Response(JSON.stringify({ dryRun: true, wouldSend: body }), {
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    const res = await fetch(TRUST_LAB_OPS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': TRUST_LAB_OPS_WEBHOOK_SECRET },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Trust Lab Ops webhook rejected the booking', res.status, await res.text())
      // Left as synced_to_erp = false — a booking never fails for the patient over this;
      // it just means someone needs to look at the function logs and retry manually.
      return new Response(JSON.stringify({ forwarded: false, status: res.status }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    if (record.id) {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('bookings').update({ synced_to_erp: true }).eq('id', record.id)
      if (error) console.error('Booking forwarded but failed to mark synced_to_erp', error)
    }

    return new Response(JSON.stringify({ forwarded: true }), {
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    })
  }
})
