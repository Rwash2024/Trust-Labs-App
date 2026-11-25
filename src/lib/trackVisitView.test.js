import test from 'node:test'
import assert from 'node:assert/strict'
import { viewModel, redactTrackUrl, formatVisitDate } from './trackVisitView.js'

const NOW = new Date('2026-11-25T10:00:00Z')
const ago = (min) => new Date(NOW.getTime() - min * 60000).toISOString()
const DEST = { lat: 30.05, lng: 31.25 }
const NEAR = { lat: 30.06, lng: 31.26 }
const base = { chemist_first_name: 'أحمد', preferred_date: '2026-11-25', started_at: null, arrived_at: null }

test('null -> invalid', () => {
  const vm = viewModel(null, NOW)
  assert.equal(vm.kind, 'invalid')
  assert.equal(vm.headline, 'اللينك ده مش شغال')
  assert.deepEqual(vm.markers, [])
  assert.equal(vm.eta, null)
})

test('assigned -> waiting, no markers, eta null', () => {
  const vm = viewModel({ ...base, status: 'assigned', dest: DEST, last: null }, NOW)
  assert.equal(vm.kind, 'waiting')
  assert.equal(vm.headline, 'هنبلّغك لما الكيميائي يتحرك')
  assert.deepEqual(vm.markers, [])
  assert.equal(vm.eta, null)
  assert.deepEqual(vm.steps.map((s) => [s.done, s.current]), [[true, true], [false, false], [false, false]])
})

test('on_way, no dest -> chemist marker only, eta null', () => {
  const vm = viewModel({ ...base, status: 'on_way', dest: null, last: { ...NEAR, at: ago(1) } }, NOW)
  assert.equal(vm.kind, 'on_way')
  assert.equal(vm.markers.length, 1)
  assert.equal(vm.markers[0].kind, 'chemist')
  assert.equal(vm.eta, null)
})

test('on_way, dest, ping 1 min old -> eta, not stale, both markers', () => {
  const vm = viewModel({ ...base, status: 'on_way', dest: DEST, last: { ...NEAR, at: ago(1) } }, NOW)
  assert.ok(vm.eta && vm.eta.max === vm.eta.min + 5)
  assert.equal(vm.stale, false)
  assert.equal(vm.updatedMin, 1)
  assert.deepEqual(vm.markers.map((m) => m.kind).sort(), ['chemist', 'home'])
})

test('ping 4 min old -> stale, eta null', () => {
  const vm = viewModel({ ...base, status: 'on_way', dest: DEST, last: { ...NEAR, at: ago(4) } }, NOW)
  assert.equal(vm.stale, true)
  assert.equal(vm.eta, null)
  assert.equal(vm.updatedMin, 4)
})

test('on_way, no ping yet -> no chemist marker, eta null, not stale', () => {
  const vm = viewModel({ ...base, status: 'on_way', dest: DEST, last: null }, NOW)
  assert.equal(vm.kind, 'on_way')
  assert.equal(vm.eta, null)
  assert.equal(vm.stale, false)
  assert.equal(vm.updatedMin, null)
  assert.ok(vm.markers.every((m) => m.kind !== 'chemist'))
})

test('arrived -> no markers, last step current', () => {
  const vm = viewModel({ ...base, status: 'arrived', dest: DEST, last: { ...NEAR, at: ago(1) } }, NOW)
  assert.equal(vm.kind, 'arrived')
  assert.equal(vm.headline, 'الكيميائي وصل')
  assert.deepEqual(vm.markers, [])
  assert.equal(vm.eta, null)
  assert.deepEqual(vm.steps.map((s) => s.done), [true, true, true])
  assert.equal(vm.steps[2].current, true)
})

test('future / bad ping time is clamped, not NaN', () => {
  const future = viewModel({ ...base, status: 'on_way', dest: DEST, last: { ...NEAR, at: ago(-5) } }, NOW)
  assert.equal(future.updatedMin, 0)
  const bad = viewModel({ ...base, status: 'on_way', dest: DEST, last: { ...NEAR, at: 'nonsense' } }, NOW)
  assert.equal(bad.updatedMin, null)
  assert.equal(bad.eta, null)
})

test('redactTrackUrl hides the token', () => {
  assert.equal(redactTrackUrl('/t/abc123'), '/t/[token]')
  assert.equal(redactTrackUrl('https://x.com/t/abc123?x=1#h'), 'https://x.com/t/[token]')
  assert.equal(redactTrackUrl('/track-sample'), '/track-sample')
})

test('formatVisitDate', () => {
  assert.equal(formatVisitDate(null), '')
  assert.equal(formatVisitDate('garbage'), '')
  assert.match(formatVisitDate('2026-11-25'), /نوفمبر/)
})
