// Run with:  node --experimental-strip-types --test supabase/functions/manage-chemist/validate.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateChemistInput, normalizeEgyptPhone, mapAuthAdminError, decodeJpegBase64, archivedPhone, MAX_PHOTO_BYTES } from './validate.ts'

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
  assert.equal(validateChemistInput({ action: 'explode', chemist_id: UUID }).ok, false)
  assert.equal(validateChemistInput(null).ok, false)
  assert.equal(validateChemistInput('x').ok, false)
})

test('mapAuthAdminError: duplicate, weak password, other', () => {
  assert.deepEqual(mapAuthAdminError({ code: 'email_exists' }), { status: 409, error: 'رقم الموبايل ده مسجل قبل كده' })
  assert.equal(mapAuthAdminError({ code: 'user_already_exists' }).status, 409)
  assert.equal(mapAuthAdminError({ message: 'User already registered' }).status, 409)
  const weak = mapAuthAdminError({ code: 'weak_password', message: 'Password should contain...' })
  assert.equal(weak.status, 400)
  assert.match(weak.error, /الباسورد ضعيف/)
  assert.equal(mapAuthAdminError({ code: 'unexpected_failure', message: 'boom' }).status, 500)
  assert.equal(mapAuthAdminError(null).status, 500)
})

// A minimal JPEG-looking payload: FF D8 FF + filler.
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
const JPEG_B64 = Buffer.from(JPEG_BYTES).toString('base64')

test('update: uuid, name 2..60, phone normalised', () => {
  assert.deepEqual(validateChemistInput({ action: 'update', chemist_id: UUID, name: ' باسم سمره ', phone: '+201111898119' }), {
    ok: true,
    value: { action: 'update', chemist_id: UUID, name: 'باسم سمره', phone: '01111898119' },
  })
  assert.equal(validateChemistInput({ action: 'update', chemist_id: UUID, name: 'A', phone: '01012345678' }).ok, false)
  assert.equal(validateChemistInput({ action: 'update', chemist_id: UUID, name: 'Ahmed', phone: '123' }).ok, false)
  assert.equal(validateChemistInput({ action: 'update', chemist_id: 'x', name: 'Ahmed', phone: '01012345678' }).ok, false)
})

test('decodeJpegBase64: accepts JPEG, with or without data-URL prefix', () => {
  assert.deepEqual(decodeJpegBase64(JPEG_B64), { ok: true, bytes: JPEG_BYTES })
  assert.deepEqual(decodeJpegBase64(`data:image/jpeg;base64,${JPEG_B64}`), { ok: true, bytes: JPEG_BYTES })
})

test('decodeJpegBase64: rejects non-JPEG, garbage, empty and oversize', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]).toString('base64')
  assert.equal(decodeJpegBase64(png).ok, false)
  assert.equal(decodeJpegBase64('***not base64***').ok, false)
  assert.equal(decodeJpegBase64('').ok, false)
  assert.equal(decodeJpegBase64(42).ok, false)
  const big = new Uint8Array(MAX_PHOTO_BYTES + 1)
  big.set([0xff, 0xd8, 0xff])
  const r = decodeJpegBase64(Buffer.from(big).toString('base64'))
  assert.equal(r.ok, false)
  assert.match(r.error, /كبيرة/)
})

test('set_photo: needs uuid and a JPEG', () => {
  const r = validateChemistInput({ action: 'set_photo', chemist_id: UUID, image: JPEG_B64 })
  assert.equal(r.ok, true)
  assert.equal(r.value.action, 'set_photo')
  assert.deepEqual(r.value.image, JPEG_BYTES)
  assert.equal(validateChemistInput({ action: 'set_photo', chemist_id: UUID, image: 'AAAA' }).ok, false)
  assert.equal(validateChemistInput({ action: 'set_photo', chemist_id: 'x', image: JPEG_B64 }).ok, false)
})

test('remove_photo and delete: need a uuid', () => {
  assert.deepEqual(validateChemistInput({ action: 'remove_photo', chemist_id: UUID }), {
    ok: true,
    value: { action: 'remove_photo', chemist_id: UUID },
  })
  assert.deepEqual(validateChemistInput({ action: 'delete', chemist_id: UUID }), { ok: true, value: { action: 'delete', chemist_id: UUID } })
  assert.equal(validateChemistInput({ action: 'delete' }).ok, false)
  assert.equal(validateChemistInput({ action: 'remove_photo', chemist_id: 'x' }).ok, false)
})

test('archivedPhone frees the unique phone but keeps it readable', () => {
  const a = archivedPhone('01111898119', UUID)
  assert.equal(a, 'archived-123e4567-01111898119')
  assert.equal(normalizeEgyptPhone(a), null)
})
