// Cloud save on the Trust Labs Supabase project: one shared row (id "main") that only admin accounts can read or write.
// Plain fetch against Supabase's REST endpoints, so there is nothing to install. The public (publishable) key is meant to be in the browser;
// access is enforced by the database's row-level security, not by hiding the key.

const SESSION_KEY = 'campaign-dashboard-cloud-session'
const TABLE = 'campaign_hub_state'
const ROW_ID = 'main'

const MSG = {
  off: 'الحفظ على السحابة مش متفعّل في النسخة دي.',
  offline: 'مفيش اتصال بالسيرفر، جرّب تاني.',
  badLogin: 'الإيميل أو الباسورد غلط.',
  tooMany: 'محاولات دخول كتير، استنى دقيقة وجرّب تاني.',
  notAdmin: 'الحساب ده مش أدمن، سجّل بحساب أدمن.',
  forbidden: 'الحساب ده معهوش صلاحية الحفظ على السحابة.',
  server: 'حصلت مشكلة في السيرفر، جرّب تاني.',
  needsLogin: 'سجّل دخول الأول.',
}

const safeJson = async (res) => {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export function createCloud({ url, anonKey, fetchImpl = globalThis.fetch?.bind(globalThis), storage = globalThis.localStorage, now = () => Date.now() } = {}) {
  const enabled = Boolean(url && anonKey && fetchImpl)

  const readSession = () => {
    try {
      const raw = storage?.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }
  const writeSession = (s) => {
    try {
      storage?.setItem(SESSION_KEY, JSON.stringify(s))
    } catch {
      /* storage blocked: the user simply signs in again next time */
    }
  }
  const clearSession = () => {
    try {
      storage?.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }

  const authPost = async (grant, body) => {
    const res = await fetchImpl(`${url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { res, data: await safeJson(res) }
  }

  const sessionFrom = (data, fallback = {}) => ({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: now() + (Number(data.expires_in) || 3600) * 1000,
    email: data.user?.email ?? fallback.email ?? '',
    role: data.user?.app_metadata?.role ?? fallback.role ?? null,
  })

  async function refresh() {
    const s = readSession()
    if (!s?.refreshToken) return false
    try {
      const { res, data } = await authPost('refresh_token', { refresh_token: s.refreshToken })
      if (!res.ok || !data?.access_token) {
        clearSession()
        return false
      }
      writeSession(sessionFrom(data, s))
      return true
    } catch {
      return false
    }
  }

  async function rest(path, init = {}) {
    const doFetch = () => {
      const s = readSession()
      return fetchImpl(`${url}/rest/v1/${path}`, {
        ...init,
        headers: { apikey: anonKey, Authorization: `Bearer ${s.accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      })
    }
    let s = readSession()
    if (!s) return { needsLogin: true }
    if (s.expiresAt - 60_000 <= now() && !(await refresh())) return { needsLogin: true }
    let res = await doFetch()
    if (res.status === 401) {
      if (!(await refresh())) return { needsLogin: true }
      res = await doFetch()
      if (res.status === 401) {
        clearSession()
        return { needsLogin: true }
      }
    }
    return { res, data: await safeJson(res) }
  }

  const fail = (error, extra = {}) => ({ ok: false, error, ...extra })
  const needsLogin = () => fail(MSG.needsLogin, { needsLogin: true })

  return {
    enabled,
    getSession: () => (enabled ? readSession() : null),
    signOut: () => clearSession(),

    async signIn(email, password) {
      if (!enabled) return fail(MSG.off)
      try {
        const { res, data } = await authPost('password', { email, password })
        if (res.status === 429) return fail(MSG.tooMany)
        if (!res.ok || !data?.access_token) return fail(res.status >= 500 ? MSG.server : MSG.badLogin)
        if (data.user?.app_metadata?.role !== 'admin') {
          clearSession()
          return fail(MSG.notAdmin)
        }
        writeSession(sessionFrom(data))
        return { ok: true, email: data.user.email }
      } catch {
        return fail(MSG.offline)
      }
    },

    async load() {
      if (!enabled) return fail(MSG.off)
      try {
        const r = await rest(`${TABLE}?id=eq.${ROW_ID}&select=db,version,updated_at`)
        if (r.needsLogin) return needsLogin()
        if (r.res.status === 403) return fail(MSG.forbidden)
        if (!r.res.ok) return fail(MSG.server)
        const row = Array.isArray(r.data) ? r.data[0] : null
        return { ok: true, row: row ? { db: row.db, version: row.version, updatedAt: row.updated_at } : null }
      } catch {
        return fail(MSG.offline)
      }
    },

    async save(db, expectedVersion) {
      if (!enabled) return fail(MSG.off)
      try {
        const first = expectedVersion === null || expectedVersion === undefined
        const r = first
          ? await rest(TABLE, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: ROW_ID, db, version: 1 }) })
          : await rest(`${TABLE}?id=eq.${ROW_ID}&version=eq.${expectedVersion}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=representation' },
              body: JSON.stringify({ db, version: expectedVersion + 1, updated_at: new Date(now()).toISOString() }),
            })
        if (r.needsLogin) return needsLogin()
        if (r.res.status === 409) return fail('النسخة اتغيّرت من مكان تاني.', { conflict: true })
        if (r.res.status === 403) return fail(MSG.forbidden)
        if (!r.res.ok) return fail(MSG.server)
        const row = Array.isArray(r.data) ? r.data[0] : null
        if (!row) return fail('النسخة اتغيّرت من مكان تاني.', { conflict: true })
        return { ok: true, version: row.version, updatedAt: row.updated_at }
      } catch {
        return fail(MSG.offline)
      }
    },
  }
}

export const cloud = createCloud({
  url: import.meta.env?.VITE_SUPABASE_URL,
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY,
})
