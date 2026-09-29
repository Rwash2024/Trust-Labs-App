// Trust Labs App — mints a short-lived signed URL for a patient's (or a
// family member's) lab/imaging report, stored in the private
// `patient-reports` bucket.
//
// Called directly from the patient's browser (كارت الثقة), so it re-checks
// card_code+phone itself — the same rule get_patient_file/get_family_members
// enforce in Postgres — before it will sign anything. Without this, anyone
// who guessed a storage path could download someone else's report; that's
// exactly the class of bug this whole card system replaced MedCloud to fix.
//
// Deploy: supabase functions deploy get-patient-report-url --no-verify-jwt
// Requires: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (service role needed to
// read across rows regardless of RLS, and to sign a private-bucket URL).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SIGNED_URL_TTL_SECONDS = 300 // 5 minutes — long enough to open, short enough not to matter if shared

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { cardCode, phone, kind, memberId } = await req.json()
    if (!cardCode || !phone || (kind !== 'investigation' && kind !== 'imaging')) {
      return json({ error: 'bad_request' }, 400)
    }
    const column = kind === 'investigation' ? 'investigation_file_path' : 'imaging_file_path'

    // Always verify against the card's own phone first — a family member's
    // file is only reachable through the same already-verified holder phone,
    // never on its own.
    const { data: card, error: cardErr } = await supabase
      .from('patient_cards')
      .select('phone')
      .eq('card_code', cardCode)
      .single()

    if (cardErr || !card || card.phone !== phone) {
      return json({ error: 'unauthorized' }, 401)
    }

    let filePath: string | null = null

    if (memberId) {
      const { data: member, error: memberErr } = await supabase
        .from('family_members')
        .select(column)
        .eq('id', memberId)
        .eq('card_code', cardCode)
        .single()
      if (memberErr || !member) return json({ error: 'not_found' }, 404)
      filePath = (member as Record<string, string | null>)[column]
    } else {
      const { data: row, error: rowErr } = await supabase
        .from('patient_cards')
        .select(column)
        .eq('card_code', cardCode)
        .single()
      if (rowErr || !row) return json({ error: 'not_found' }, 404)
      filePath = (row as Record<string, string | null>)[column]
    }

    if (!filePath) return json({ error: 'no_file' }, 404)

    const { data: signed, error: signErr } = await supabase.storage
      .from('patient-reports')
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS)

    if (signErr || !signed) {
      console.error('Failed to sign patient report URL', signErr)
      return json({ error: 'sign_failed' }, 500)
    }

    return json({ url: signed.signedUrl })
  } catch (err) {
    console.error(err)
    return json({ error: String(err) }, 500)
  }
})
