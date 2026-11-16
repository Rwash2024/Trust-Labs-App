import { emptyDb, loadDb, saveDb, exportDb, importDb } from './storage.js'

const post = {
  id: 'p1', ideaId: 'i1', type: 'post', platform: 'instagram', date: '2026-12-03', time: '20:00',
  headline: 'أنقذ قلبك', caption: 'كابشن', hashtags: ['#تحاليل'], panelService: 'خدمة',
  panelBullets: ['1', '2', '3', '4'], image: { concept: 'c', subject: 's', mood: 'm', accent: 'a' }, status: 'idea',
}

test('loadDb returns empty db for empty storage', () => {
  expect(loadDb()).toEqual(emptyDb())
})

test('loadDb survives invalid JSON and throwing storage', () => {
  localStorage.setItem('campaign-dashboard-db', '{bad')
  expect(loadDb()).toEqual(emptyDb())
  const orig = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
  expect(loadDb()).toEqual(emptyDb())
  expect(saveDb(emptyDb())).toBe(false)
  Object.defineProperty(globalThis, 'localStorage', orig)
})

test('save then load round-trips', () => {
  const db = { ...emptyDb(), posts: [post] }
  expect(saveDb(db)).toBe(true)
  expect(loadDb()).toEqual(db)
})

test('importDb rejects corrupt JSON and wrong schema version with Arabic error', () => {
  for (const text of ['{bad', JSON.stringify({ ...emptyDb(), schemaVersion: 2 })]) {
    const r = importDb(text)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/[؀-ۿ]/)
  }
})

test('importDb rejects a post with an invalid type', () => {
  const bad = { ...emptyDb(), posts: [{ ...post, type: 'tweet' }] }
  expect(importDb(JSON.stringify(bad)).ok).toBe(false)
})

test('export then import round-trips', () => {
  const db = { ...emptyDb(), posts: [post] }
  const r = importDb(exportDb(db))
  expect(r.ok).toBe(true)
  expect(r.db).toEqual(db)
})

test('a post may carry an ad block, and old posts without one still load', () => {
  const ad = { enabled: true, budget: 850, days: 7, regions: ['المهندسين'], ageFrom: 25, ageTo: 55, gender: 'female' }
  expect(importDb(JSON.stringify({ ...emptyDb(), posts: [{ ...post, ad }] })).ok).toBe(true)
  expect(importDb(JSON.stringify({ ...emptyDb(), posts: [post] })).ok).toBe(true)
})

test('an invalid ad block makes the import fail with an Arabic message', () => {
  const bad = { enabled: true, budget: -1, days: 7, regions: ['المهندسين'], ageFrom: 25, ageTo: 55, gender: 'female' }
  const r = importDb(JSON.stringify({ ...emptyDb(), posts: [{ ...post, ad: bad }] }))
  expect(r.ok).toBe(false)
  expect(r.error).toMatch(/[؀-ۿ]/)
})
