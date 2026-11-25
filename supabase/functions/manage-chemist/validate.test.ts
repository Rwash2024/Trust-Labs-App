// Run with:  node --experimental-strip-types --test supabase/functions/manage-chemist/validate.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateChemistInput, normalizeEgyptPhone } from './validate.ts'

const UUID = '123e4567-e89b-42d3-a456-426614174000'

test('normalizeEgyptPhone handles common formats', () => {
  assert.equal(normalizeEgyptPhone('01012345678'), '01012345678')
  assert.equal(normalizeEgyptPhone('+201012345678'), '01012345678')
  assert.equal(normalizeEgyptPhone('00201012345678'), '01012345678')
  assert.equal(normalizeEgyptPhone('٠١٠١٢٣٤٥٦٧٨'), '01012345678')
  assert.equal(normalizeEgyptPhone('1012345678'), '01012345678')
  assert.equal(normalizeEgyptPhone('0131234567'), null)
  assert.equal(normalizeEgyptPhone(''), null)
  assert.equal(normalizeEgyptPhone(undefined), null)
})

test('create: valid input, +20 phone is normalised', () => {
  const r = validateChemistInput({ action: 'create', name: '  أحمد علي ', phone: '+201112345678', password: 'secret123' })
  assert.deepEqual(r, { ok: true, value: { action: 'create', name: 'أحمد علي', phone: '01112345678', password: 'secret123' } })
})

test('create: bad phone rejected', () => {
  const r = validateChemistInput({ action: 'create', name: 'Ahmed', phone: '12345', password: 'secret123' })
  assert.equal(r.ok, false)
})

test('create: short password rejected', () => {
  const r = validateChemistInput({ action: 'create', name: 'Ahmed', phone: '01012345678', password: '1234567' })
  assert.equal(r.ok, false)
})

test('create: name length 2..60', () => {
  assert.equal(validateChemistInput({ action: 'create', name: 'A', phone: '01012345678', password: 'secret123' }).ok, false)
  assert.equal(validateChemistInput({ action: 'create', name: 'x'.repeat(61), phone: '01012345678', password: 'secret123' }).ok, false)
  assert.equal(validateChemistInput({ action: 'create', name: 'x'.repeat(60), phone: '01012345678', password: 'secret123' }).ok, true)
})

test('reset_password: needs uuid id and password >= 8', () => {
  assert.deepEqual(validateChemistInput({ action: 'reset_password', chemist_id: UUID, password: 'secret123' }), {
    ok: true,
    value: { action: 'reset_password', chemist_id: UUID, password: 'secret123' },
  })
  assert.equal(validateChemistInput({ action: 'reset_password', chemist_id: 'nope', password: 'secret123' }).ok, false)
  assert.equal(validateChemistInput({ action: 'reset_password', chemist_id: UUID, password: 'short' }).ok, false)
})

test('set_active: needs uuid id and boolean', () => {
  assert.deepEqual(validateChemistInput({ action: 'set_active', chemist_id: UUID, active: false }), {
    ok: true,
    value: { action: 'set_active', chemist_id: UUID, active: false },
  })
  assert.equal(validateChemistInput({ action: 'set_active', chemist_id: UUID, active: 'no' }).ok, false)
  assert.equal(validateChemistInput({ action: 'set_active', chemist_id: 'x', active: true }).ok, false)
})

test('unknown action / non-object body rejected', () => {
  assert.equal(validateChemistInput({ action: 'delete' }).ok, false)
  assert.equal(validateChemistInput(null).ok, false)
  assert.equal(validateChemistInput('x').ok, false)
})
