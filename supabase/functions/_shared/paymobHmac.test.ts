// Run with:  node --experimental-strip-types --test supabase/functions/_shared/paymobHmac.test.ts
// (or `deno test` — the code only uses Web Crypto, available in both.)
//
// The fixture below is the sample "transaction processed" callback from
// Paymob's HMAC docs, and EXPECTED_STRING is the concatenated string the docs
// show for it. The docs' sample HMAC was produced with a secret that isn't
// published, so the signature itself is checked against an independently
// computed HMAC-SHA512 (node:crypto) rather than the docs' hex value.

import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { buildHmacString, computePaymobHmac, timingSafeEqual } from './paymobHmac.ts'

const SAMPLE_OBJ = {
  id: 192036465,
  pending: false,
  amount_cents: 100000,
  success: true,
  is_auth: false,
  is_capture: false,
  is_standalone_payment: true,
  is_voided: false,
  is_refunded: false,
  is_3d_secure: true,
  integration_id: 4097558,
  has_parent_transaction: false,
  order: { id: 217503754, merchant_order_id: null },
  created_at: '2024-06-13T11:33:44.592345',
  currency: 'EGP',
  source_data: { pan: '2346', type: 'card', sub_type: 'MasterCard' },
  error_occured: false,
  owner: 302852,
}

const EXPECTED_STRING =
  '1000002024-06-13T11:33:44.592345EGPfalsefalse1920364654097558truefalsefalsefalsetruefalse217503754302852false2346MasterCardcardtrue'

test('concatenates fields in the order Paymob documents', () => {
  assert.equal(buildHmacString(SAMPLE_OBJ), EXPECTED_STRING)
})

test('HMAC-SHA512 matches an independent implementation', async () => {
  const secret = 'test-secret'
  const expected = createHmac('sha512', secret).update(EXPECTED_STRING).digest('hex')
  assert.equal(await computePaymobHmac(SAMPLE_OBJ, secret), expected)
})

test('changing a signed field changes the HMAC', async () => {
  const tampered = { ...SAMPLE_OBJ, amount_cents: 100 }
  assert.notEqual(await computePaymobHmac(tampered, 's'), await computePaymobHmac(SAMPLE_OBJ, 's'))
})

test('timingSafeEqual', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true)
  assert.equal(timingSafeEqual('abc', 'abd'), false)
  assert.equal(timingSafeEqual('abc', 'abcd'), false)
})
