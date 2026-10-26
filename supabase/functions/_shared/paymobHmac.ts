// Paymob "transaction processed" callback HMAC.
// Spec: https://developers.paymob.com/paymob-docs/developers/webhook-callbacks-and-hmac/hmac/hmac-transaction-callback
//
// The listed fields are read from the callback's `obj`, concatenated as plain
// strings in exactly this order (lexicographic by key), and signed with
// HMAC-SHA512 using the account's HMAC secret. The result is compared with the
// `hmac` query parameter Paymob appends to our notification URL.
//
// Note what is NOT covered: order.merchant_order_id (our booking reference),
// the items and the billing data. The caller must therefore never trust those
// alone — see paymob-webhook, which also checks the amount against what the
// server itself recorded when it created the payment.

const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const

// deno-lint-ignore no-explicit-any
function readPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

// deno-lint-ignore no-explicit-any
export function buildHmacString(obj: any): string {
  return HMAC_FIELDS.map((path) => String(readPath(obj, path) ?? '')).join('')
}

// deno-lint-ignore no-explicit-any
export async function computePaymobHmac(obj: any, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(buildHmacString(obj)))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

// Constant-time comparison so response timing can't be used to guess the hash.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
