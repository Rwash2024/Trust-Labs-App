// Trust Labs App — forwards new "قيّم زيارتك" ratings to Trust Lab Ops (the internal ERP).
// Mirrors forward-booking-to-erp exactly, just a different table/URL/shape.
//
// Trigger: a Postgres trigger on the `visit_ratings` table (INSERT) that calls
// net.http_post — see supabase/visit_ratings_forward_trigger_migration.sql.
// Not called from the browser: the x-webhook-secret Trust Lab Ops needs
// never reaches the client.
//
// Deploy: supabase functions deploy forward-visit-rating-to-erp --no-verify-jwt
// Requires secrets (Project Settings > Edge Functions > Secrets):
//   TRUST_LAB_OPS_SURVEY_WEBHOOK_URL — https://udcfckeolxnvtdwcupyo.supabase.co/functions/v1/receive-survey-webhook
//   TRUST_LAB_OPS_WEBHOOK_SECRET     — same shared secret already used for bookings
//   FORWARD_WEBHOOK_SECRET           — same secret already used for bookings; the
//                                       trigger must send it back as x-forward-secret
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — to mark the rating as synced afterwards

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { toErpBranchName } from '../_shared/branchMap.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forward-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const FORWARD_WEBHOOK_SECRET = Deno.env.get('FORWARD_WEBHOOK_SECRET')
const TRUST_LAB_OPS_SURVEY_WEBHOOK_URL = Deno.env.get('TRUST_LAB_OPS_SURVEY_WEBHOOK_URL')
const TRUST_LAB_OPS_WEBHOOK_SECRET = Deno.env.get('TRUST_LAB_OPS_WEBHOOK_SECRET')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!FORWARD_WEBHOOK_SECRET || req.headers.get('x-forward-secret') !== FORWARD_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS_HEADERS })
    }
    if (!TRUST_LAB_OPS_SURVEY_WEBHOOK_URL || !TRUST_LAB_OPS_WEBHOOK_SECRET) {
      throw new Error('Missing TRUST_LAB_OPS_SURVEY_WEBHOOK_URL or TRUST_LAB_OPS_WEBHOOK_SECRET env vars')
    }

    const payload = await req.json()
    const record = payload?.record
    if (!record || payload.type !== 'INSERT') {
      // Not a rating insert (could be a misconfigured trigger, or a retry with an
      // unexpected shape) — acknowledge without forwarding anything.
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...CORS_HEADERS, 'content-type': 'application/json' } })
    }

    const body = {
      id: record.id,
      visit_type: record.visit_type,
      branch_name: record.visit_type === 'branch' ? toErpBranchName(record.branch_name) : null,
      overall: record.overall,
      speed: record.visit_type === 'branch' ? record.speed : null,
      punctuality: record.visit_type === 'home' ? record.punctuality : null,
      staff: record.staff,
      chemist_name: record.visit_type === 'home' ? record.chemist_name : null,
      name: record.name,
      phone: record.phone,
      comment: record.comment,
      created_at: record.created_at,
    }

    // Dry-run: shows exactly what would be sent, without calling Trust Lab Ops at all.
    if (req.headers.get('x-dry-run') === '1') {
      return new Response(JSON.stringify({ dryRun: true, wouldSend: body }), {
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    const res = await fetch(TRUST_LAB_OPS_SURVEY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-webhook-secret': TRUST_LAB_OPS_WEBHOOK_SECRET },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Trust Lab Ops survey webhook rejected the rating', res.status, await res.text())
      // Left as synced_to_erp = false — a rating never fails for the patient over this;
      // it just means someone needs to look at the function logs and retry manually.
      return new Response(JSON.stringify({ forwarded: false, status: res.status }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      })
    }

    if (record.id) {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('visit_ratings').update({ synced_to_erp: true }).eq('id', record.id)
      if (error) console.error('Rating forwarded but failed to mark synced_to_erp', error)
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
