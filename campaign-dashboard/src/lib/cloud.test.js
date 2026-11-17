import { createCloud } from './cloud.js'

const URL_ = 'https://proj.supabase.co'
const KEY = 'sb_publishable_test'
const NOW = Date.parse('2026-11-20T10:00:00Z')

function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), dump: () => JSON.stringify([...m]) }
}
const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const tokenBody = (role = 'admin', over = {}) => ({
  access_token: 'AT1', refresh_token: 'RT1', expires_in: 3600, user: { email: 'boss@example.com', app_metadata: { role } }, ...over,
})

function setup(responder, { signedIn = false, role = 'admin' } = {}) {
  const calls = []
  const fetchImpl = vi.fn(async (url, init = {}) => {
    calls.push({ url, init, body: init.body ? JSON.parse(init.body) : undefined })
    return responder(url, init, calls)
  })
  const storage = memoryStorage()
  if (signedIn) {
    storage.setItem('campaign-dashboard-cloud-session', JSON.stringify({ accessToken: 'AT0', refreshToken: 'RT0', expiresAt: NOW + 3600_000, email: 'boss@example.com', role }))
  }
  const cloud = createCloud({ url: URL_, anonKey: KEY, fetchImpl, storage, now: () => NOW })
  return { cloud, calls, storage, fetchImpl }
}

test('without url or key the cloud is off and every call refuses politely', async () => {
  const cloud = createCloud({ url: '', anonKey: '' })
  expect(cloud.enabled).toBe(false)
  expect((await cloud.signIn('a@b.c', 'x')).ok).toBe(false)
  expect((await cloud.load()).ok).toBe(false)
})

test('signing in stores the session but never the password, and only admins get in', async () => {
  const { cloud, storage, calls } = setup(() => json(200, tokenBody('admin')))
  const r = await cloud.signIn('boss@example.com', 'secret-pass')
  expect(r).toEqual({ ok: true, email: 'boss@example.com' })
  expect(calls[0].url).toBe(`${URL_}/auth/v1/token?grant_type=password`)
  expect(calls[0].init.headers.apikey).toBe(KEY)
  expect(calls[0].body).toEqual({ email: 'boss@example.com', password: 'secret-pass' })
  expect(storage.dump()).not.toContain('secret-pass')
  expect(cloud.getSession()).toMatchObject({ email: 'boss@example.com', role: 'admin' })
})

test('a wrong password gives an Arabic message and no session', async () => {
  const { cloud } = setup(() => json(400, { error_description: 'Invalid login credentials' }))
  const r = await cloud.signIn('boss@example.com', 'nope')
  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/[؀-ۿ]/)
  expect(cloud.getSession()).toBeNull()
})

test('a signed-in account that is not an admin is turned away and cleared', async () => {
  const { cloud } = setup(() => json(200, tokenBody('courier')))
  const r = await cloud.signIn('courier@example.com', 'pw')
  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/أدمن/)
  expect(cloud.getSession()).toBeNull()
})

test('a network failure is reported in Arabic and never throws', async () => {
  const { cloud } = setup(() => { throw new Error('offline') })
  const r = await cloud.signIn('a@b.c', 'x')
  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/[؀-ۿ]/)
})

test('load reads the single shared row with the user token and the public key', async () => {
  const row = { db: { posts: [] }, version: 3, updated_at: '2026-11-19T08:00:00Z' }
  const { cloud, calls } = setup(() => json(200, [row]), { signedIn: true })
  const r = await cloud.load()
  expect(r).toEqual({ ok: true, row: { db: { posts: [] }, version: 3, updatedAt: '2026-11-19T08:00:00Z' } })
  expect(calls[0].url).toBe(`${URL_}/rest/v1/campaign_hub_state?id=eq.main&select=db,version,updated_at`)
  expect(calls[0].init.headers.Authorization).toBe('Bearer AT0')
  expect(calls[0].init.headers.apikey).toBe(KEY)
})

test('load with no row yet returns row null', async () => {
  const { cloud } = setup(() => json(200, []), { signedIn: true })
  expect(await cloud.load()).toEqual({ ok: true, row: null })
})

test('load without a session asks for a login', async () => {
  const { cloud } = setup(() => json(200, []))
  expect(await cloud.load()).toMatchObject({ ok: false, needsLogin: true })
})

test('the first save inserts version 1; a duplicate key is a conflict', async () => {
  const ok = setup(() => json(201, [{ version: 1, updated_at: '2026-11-20T10:00:00Z' }]), { signedIn: true })
  const r = await ok.cloud.save({ posts: [1] }, null)
  expect(r).toEqual({ ok: true, version: 1, updatedAt: '2026-11-20T10:00:00Z' })
  expect(ok.calls[0].init.method).toBe('POST')
  expect(ok.calls[0].body).toEqual({ id: 'main', db: { posts: [1] }, version: 1 })
  expect(ok.calls[0].init.headers.Prefer).toContain('return=representation')
  const dup = setup(() => json(409, { code: '23505' }), { signedIn: true })
  expect(await dup.cloud.save({}, null)).toMatchObject({ ok: false, conflict: true })
})

test('later saves update only if the version still matches, and bump it', async () => {
  const { cloud, calls } = setup(() => json(200, [{ version: 5, updated_at: '2026-11-20T10:00:00Z' }]), { signedIn: true })
  const r = await cloud.save({ posts: [] }, 4)
  expect(r).toMatchObject({ ok: true, version: 5 })
  expect(calls[0].init.method).toBe('PATCH')
  expect(calls[0].url).toBe(`${URL_}/rest/v1/campaign_hub_state?id=eq.main&version=eq.4`)
  expect(calls[0].body).toMatchObject({ db: { posts: [] }, version: 5 })
})

test('an update that matches no row means someone else saved first: conflict', async () => {
  const { cloud } = setup(() => json(200, []), { signedIn: true })
  expect(await cloud.save({}, 4)).toMatchObject({ ok: false, conflict: true })
})

test('an expired token is refreshed before the request', async () => {
  const { cloud, calls, storage } = setup((url) => (url.includes('/auth/v1/token') ? json(200, tokenBody('admin', { access_token: 'AT2', refresh_token: 'RT2' })) : json(200, [])), { signedIn: true })
  storage.setItem('campaign-dashboard-cloud-session', JSON.stringify({ accessToken: 'OLD', refreshToken: 'RT0', expiresAt: NOW - 1000, email: 'boss@example.com', role: 'admin' }))
  await cloud.load()
  expect(calls[0].url).toBe(`${URL_}/auth/v1/token?grant_type=refresh_token`)
  expect(calls[0].body).toEqual({ refresh_token: 'RT0' })
  expect(calls[1].init.headers.Authorization).toBe('Bearer AT2')
})

test('a 401 triggers one refresh and one retry', async () => {
  let rest = 0
  const { cloud, calls } = setup((url) => {
    if (url.includes('/auth/v1/token')) return json(200, tokenBody('admin', { access_token: 'AT3' }))
    rest += 1
    return rest === 1 ? json(401, { message: 'JWT expired' }) : json(200, [])
  }, { signedIn: true })
  expect(await cloud.load()).toEqual({ ok: true, row: null })
  expect(calls.map((c) => c.url.includes('/auth/') ? 'auth' : 'rest')).toEqual(['rest', 'auth', 'rest'])
})

test('if the refresh fails the session is dropped and a login is requested', async () => {
  const { cloud } = setup((url) => (url.includes('/auth/v1/token') ? json(400, { error: 'invalid_grant' }) : json(401, {})), { signedIn: true })
  const r = await cloud.load()
  expect(r).toMatchObject({ ok: false, needsLogin: true })
  expect(cloud.getSession()).toBeNull()
})

test('signOut clears the stored session', async () => {
  const { cloud } = setup(() => json(200, []), { signedIn: true })
  expect(cloud.getSession()).not.toBeNull()
  cloud.signOut()
  expect(cloud.getSession()).toBeNull()
})

test('a server error on save is reported without claiming a conflict', async () => {
  const { cloud } = setup(() => json(500, { message: 'boom' }), { signedIn: true })
  const r = await cloud.save({}, 2)
  expect(r.ok).toBe(false)
  expect(r.conflict).toBeFalsy()
  expect(r.error).toMatch(/[؀-ۿ]/)
})
