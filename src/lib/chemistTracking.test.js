import test from 'node:test'
import assert from 'node:assert/strict'
import {
  haversineM,
  etaRange,
  minutesSince,
  normalizeEgyptPhone,
  chemistEmailFromPhone,
  trackUrl,
  whatsAppUrl,
  attentionFlags,
  attentionRank,
} from './chemistTracking.js'

// Cairo, and a point due north ~3000 m away (1 degree of latitude = 111194.93 m on a 6371 km sphere).
const P0 = { lat: 30.0444, lng: 31.2357 }
const P3km = { lat: 30.0444 + 3000 / 111194.93, lng: 31.2357 }

test('haversineM: the test point really is ~3000 m away', () => {
  assert.ok(Math.abs(haversineM(P0, P3km) - 3000) < 1)
  assert.equal(haversineM(P0, P0), 0)
})

test('etaRange: 3 km straight line -> 10..15', () => {
  // 3 km * 1.4 / 25 km/h = 10.08 min
  assert.deepEqual(etaRange(P0, P3km), { min: 10, max: 15 })
})
test('etaRange: null destination -> null', () => assert.equal(etaRange(P0, null), null))
test('etaRange: null origin -> null', () => assert.equal(etaRange(null, P0), null))
test('etaRange: very close -> 5..10 floor', () => assert.deepEqual(etaRange(P0, P0), { min: 5, max: 10 }))

test('minutesSince is floored', () => {
  const now = new Date('2026-11-25T10:00:00Z')
  assert.equal(minutesSince('2026-11-25T09:54:01Z', now), 5)
  assert.equal(minutesSince('2026-11-25T09:50:00Z', now), 10)
})

test('normalizeEgyptPhone variants', () => {
  for (const v of ['01012345678', '+201012345678', '00201012345678', '٠١٠١٢٣٤٥٦٧٨', '010 1234 5678'])
    assert.equal(normalizeEgyptPhone(v), '01012345678')
  assert.equal(normalizeEgyptPhone('12345'), null)
  assert.equal(normalizeEgyptPhone(''), null)
  assert.equal(normalizeEgyptPhone(null), null)
})

test('chemistEmailFromPhone', () => {
  assert.equal(chemistEmailFromPhone('+20 101 234 5678'), '01012345678@chemist.local')
  assert.equal(chemistEmailFromPhone('abc'), null)
})

test('trackUrl', () => assert.equal(trackUrl('https://app.example', 'tok123'), 'https://app.example/t/tok123'))

test('whatsAppUrl encodes Arabic text and uses 20 prefix', () => {
  const u = whatsAppUrl('01012345678', 'https://x/t/abc', 'أحمد')
  assert.ok(u.startsWith('https://wa.me/201012345678?text='))
  const text = decodeURIComponent(u.split('text=')[1])
  assert.ok(text.includes('https://x/t/abc'))
  assert.equal(text, 'أهلاً 👋 الكيميائي أحمد اتحدد لزيارتك من معامل ترست. تقدر تتابع وصوله من اللينك ده: https://x/t/abc')
})
test('whatsAppUrl without a name drops the name, and bad phone -> null', () => {
  const u = whatsAppUrl('+201012345678', 'https://x/t/abc')
  assert.equal(decodeURIComponent(u.split('text=')[1]), 'أهلاً 👋 الكيميائي اتحدد لزيارتك من معامل ترست. تقدر تتابع وصوله من اللينك ده: https://x/t/abc')
  assert.equal(whatsAppUrl('123', 'https://x'), null)
})

test('attentionFlags', () => {
  const now = new Date('2026-11-25T10:00:00Z')
  assert.deepEqual(attentionFlags({ trip_status: 'on_way', trip_started_at: '2026-11-25T09:50:00Z', last_ping_at: '2026-11-25T09:54:00Z' }, now), ['stale'])
  assert.deepEqual(attentionFlags({ trip_status: 'on_way', trip_started_at: '2026-11-25T08:50:00Z', last_ping_at: '2026-11-25T09:59:30Z' }, now), ['long'])
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-25' }, now), ['not_started'])
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-26' }, now), [])
})
test('attentionFlags: "today" is the Cairo date, not UTC', () => {
  // 22:30 UTC on the 25th is already 00:30 on the 26th in Cairo (UTC+2).
  const now = new Date('2026-11-25T22:30:00Z')
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-26' }, now), ['not_started'])
  assert.deepEqual(attentionFlags({ trip_status: 'assigned', preferred_date: '2026-11-25' }, now), [])
})
test('attentionFlags: both stale and long can apply', () => {
  const now = new Date('2026-11-25T10:00:00Z')
  assert.deepEqual(attentionFlags({ trip_status: 'on_way', trip_started_at: '2026-11-25T08:00:00Z', last_ping_at: '2026-11-25T09:00:00Z' }, now), ['stale', 'long'])
})

test('attentionRank orders stale < long < not_started < none', () => {
  assert.ok(attentionRank(['stale']) < attentionRank(['long']))
  assert.ok(attentionRank(['long']) < attentionRank(['not_started']))
  assert.ok(attentionRank(['not_started']) < attentionRank([]))
  assert.equal(attentionRank(['long', 'stale']), attentionRank(['stale']))
})
