import test from 'node:test'
import assert from 'node:assert/strict'
import { visitAction, tripScreenWarning, testsCount, mapsUrl } from './chemistView.js'

test('visitAction: assigned -> start', () => assert.equal(visitAction({ trip_status: 'assigned' }), 'start'))
test('visitAction: on_way -> arrive', () => assert.equal(visitAction({ trip_status: 'on_way' }), 'arrive'))
test('visitAction: arrived -> none', () => assert.equal(visitAction({ trip_status: 'arrived' }), 'none'))
test('visitAction: none/unassigned -> none', () => {
  assert.equal(visitAction({ trip_status: 'none' }), 'none')
  assert.equal(visitAction({ trip_status: null }), 'none')
  assert.equal(visitAction(null), 'none')
})

const NOW = new Date('2026-11-25T10:00:00Z')
const ago = (s) => new Date(NOW.getTime() - s * 1000).toISOString()

test('tripScreenWarning: denied permission -> no_permission', () => {
  assert.equal(tripScreenWarning({ permission: 'denied', lastSentAt: ago(10), lastError: null }, NOW), 'no_permission')
})
test('tripScreenWarning: last sent 3 min ago -> not_sending', () => {
  assert.equal(tripScreenWarning({ permission: 'granted', lastSentAt: ago(180), lastError: null }, NOW), 'not_sending')
})
test('tripScreenWarning: sent 30 s ago -> null', () => {
  assert.equal(tripScreenWarning({ permission: 'granted', lastSentAt: ago(30), lastError: null }, NOW), null)
})
test('tripScreenWarning: last send errored -> not_sending', () => {
  assert.equal(tripScreenWarning({ permission: 'granted', lastSentAt: ago(30), lastError: 'x' }, NOW), 'not_sending')
})
test('tripScreenWarning: nothing sent yet, trip just started -> null', () => {
  assert.equal(tripScreenWarning({ permission: 'prompt', lastSentAt: null, lastError: null, startedAt: ago(20) }, NOW), null)
})
test('tripScreenWarning: nothing sent for >2 min since start -> not_sending', () => {
  assert.equal(tripScreenWarning({ permission: 'prompt', lastSentAt: null, lastError: null, startedAt: ago(130) }, NOW), 'not_sending')
})

test('testsCount: array, JSON string, comma string, empty', () => {
  assert.equal(testsCount([{ name: 'a' }, { name: 'b' }]), 2)
  assert.equal(testsCount('["a","b","c"]'), 3)
  assert.equal(testsCount('CBC، سكر صائم, TSH'), 3)
  assert.equal(testsCount(null), 0)
  assert.equal(testsCount(''), 0)
  assert.equal(testsCount({ a: 1 }), 0)
})

test('mapsUrl: pin, then link, then address search', () => {
  assert.equal(
    mapsUrl({ location_lat: 30.1, location_lng: 31.2, location_link: 'https://maps.app.goo.gl/x', address: 'a' }),
    'https://www.google.com/maps/dir/?api=1&destination=30.1,31.2',
  )
  assert.equal(mapsUrl({ location_link: 'https://maps.app.goo.gl/x', address: 'a' }), 'https://maps.app.goo.gl/x')
  assert.equal(
    mapsUrl({ address: 'المهندسين شارع ١' }),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('المهندسين شارع ١')}`,
  )
  assert.equal(mapsUrl({}), null)
})

test('dayLabel: today / tomorrow / other (Cairo calendar)', async () => {
  const { dayLabel } = await import('./chemistView.js')
  const now = new Date('2026-11-25T22:30:00Z') // already 26 Nov in Cairo (UTC+2)
  assert.equal(dayLabel('2026-11-26', now), 'النهارده')
  assert.equal(dayLabel('2026-11-27', now), 'بكرة')
  assert.equal(dayLabel('2026-12-01', now), '2026-12-01')
  assert.equal(dayLabel(null, now), '')
})
