// Trust Labs App — admin-only management of chemist accounts (create, reset
// password, activate/deactivate). Chemists are Supabase Auth users with
// app_metadata.role = 'chemist' and email <01XXXXXXXXX>@chemist.local; the
// public.chemists row holds their name/phone/active flag.
//
// The caller must be an admin: the check reads app_metadata.role from the user
// the JWT resolves to via auth.getUser(token) — never from the request body.
//
// Deploy: supabase functions deploy manage-chemist
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — provided automatically.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { chemistEmailFromPhone, validateChemistInput } from './validate.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// ~100 years: Supabase has no permanent ban; 'none' lifts it.
const BAN_FOREVER = '876000h'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'content-type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'الطريقة غير مسموحة' }, 405)

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    }
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // 1. Who is calling? Resolve the bearer token to a real user, then check the role.
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'غير مصرح' }, 401)
    const { data: caller, error: callerErr } = await db.auth.getUser(token)
    if (callerErr || !caller?.user) return json({ error: 'غير مصرح' }, 401)
    if (caller.user.app_metadata?.role !== 'admin') return json({ error: 'للمشرفين فقط' }, 403)

    // 2. Validate the body.
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return json({ error: 'طلب غير صالح' }, 400)
    }
    const parsed = validateChemistInput(raw)
    if (!parsed.ok) return json({ error: parsed.error }, 400)
    const input = parsed.value

    // 3. Act.
    if (input.action === 'create') {
      const { data: created, error: createErr } = await db.auth.admin.createUser({
        email: chemistEmailFromPhone(input.phone),
        password: input.password,
        email_confirm: true,
        app_metadata: { role: 'chemist' },
      })
      if (createErr || !created?.user) {
        const msg = `${createErr?.message ?? ''}`.toLowerCase()
        if (createErr?.status === 422 || msg.includes('already') || msg.includes('registered')) {
          return json({ error: 'رقم الموبايل ده مسجل قبل كده' }, 409)
        }
        throw createErr ?? new Error('createUser returned no user')
      }

      const { error: insertErr } = await db
        .from('chemists')
        .insert({ id: created.user.id, name: input.name, phone: input.phone, active: true })
      if (insertErr) {
        // Don't leave an orphan auth user behind.
        const { error: delErr } = await db.auth.admin.deleteUser(created.user.id)
        if (delErr) console.error('Rollback deleteUser failed', delErr)
        if (insertErr.code === '23505') return json({ error: 'رقم الموبايل ده مسجل قبل كده' }, 409)
        throw insertErr
      }
      return json({ ok: true, chemist: { id: created.user.id, name: input.name, phone: input.phone, active: true } })
    }

    // The other actions target an existing chemist — make sure it is one
    // (this endpoint must never touch a non-chemist account, e.g. an admin).
    const { data: chemist, error: findErr } = await db.from('chemists').select('id').eq('id', input.chemist_id).maybeSingle()
    if (findErr) throw findErr
    if (!chemist) return json({ error: 'الكيميائي غير موجود' }, 404)

    if (input.action === 'reset_password') {
      const { error } = await db.auth.admin.updateUserById(input.chemist_id, { password: input.password })
      if (error) throw error
      return json({ ok: true })
    }

    // set_active: ban/unban the auth user (blocks new sign-ins and token refresh)
    // and keep chemists.active in sync.
    const { error: banErr } = await db.auth.admin.updateUserById(input.chemist_id, {
      ban_duration: input.active ? 'none' : BAN_FOREVER,
    })
    if (banErr) throw banErr
    const { error: updErr } = await db.from('chemists').update({ active: input.active }).eq('id', input.chemist_id)
    if (updErr) throw updErr
    return json({ ok: true, active: input.active })
  } catch (err) {
    console.error(err)
    return json({ error: 'حصل خطأ غير متوقع، حاول تاني' }, 500)
  }
})
