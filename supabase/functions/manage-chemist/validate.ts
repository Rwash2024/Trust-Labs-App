// Pure input validation for manage-chemist (no Deno APIs, so it can be tested
// with Node). The phone normaliser mirrors src/lib/chemistTracking.js +
// src/lib/phone.js (edge functions can't import src/) — keep them in sync.

const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeDigits(text: unknown): string {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

function cleanEgyptPhoneInput(value: unknown): string {
  let digits = normalizeDigits(value).replace(/\D/g, '')
  if (digits.startsWith('0020')) digits = digits.slice(4)
  else if (digits.startsWith('20') && digits.length > 11) digits = digits.slice(2)
  if (digits.startsWith('1') && digits.length === 10) digits = `0${digits}`
  return digits.slice(0, 11)
}

// Any common way of writing an Egyptian mobile -> 01XXXXXXXXX, else null.
export function normalizeEgyptPhone(input: unknown): string | null {
  const digits = cleanEgyptPhoneInput(input)
  return EGYPT_PHONE_REGEX.test(digits) ? digits : null
}

export function chemistEmailFromPhone(phone: string): string {
  return `${phone}@chemist.local`
}

export type ChemistInput =
  | { action: 'create'; name: string; phone: string; password: string }
  | { action: 'reset_password'; chemist_id: string; password: string }
  | { action: 'set_active'; chemist_id: string; active: boolean }

export type ValidationResult = { ok: true; value: ChemistInput } | { ok: false; error: string }

const fail = (error: string): ValidationResult => ({ ok: false, error })

export function validateChemistInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('طلب غير صالح')
  const b = body as Record<string, unknown>

  const checkPassword = (): string | null =>
    typeof b.password === 'string' && b.password.length >= 8 && b.password.length <= 72 ? b.password : null
  const checkId = (): string | null =>
    typeof b.chemist_id === 'string' && UUID_REGEX.test(b.chemist_id) ? b.chemist_id : null

  switch (b.action) {
    case 'create': {
      const name = typeof b.name === 'string' ? b.name.trim() : ''
      if (name.length < 2 || name.length > 60) return fail('الاسم لازم يكون من 2 إلى 60 حرف')
      const phone = normalizeEgyptPhone(b.phone)
      if (!phone) return fail('رقم الموبايل غير صحيح')
      const password = checkPassword()
      if (!password) return fail('كلمة السر لازم تكون 8 أحرف على الأقل')
      return { ok: true, value: { action: 'create', name, phone, password } }
    }
    case 'reset_password': {
      const chemist_id = checkId()
      if (!chemist_id) return fail('معرّف الكيميائي غير صحيح')
      const password = checkPassword()
      if (!password) return fail('كلمة السر لازم تكون 8 أحرف على الأقل')
      return { ok: true, value: { action: 'reset_password', chemist_id, password } }
    }
    case 'set_active': {
      const chemist_id = checkId()
      if (!chemist_id) return fail('معرّف الكيميائي غير صحيح')
      if (typeof b.active !== 'boolean') return fail('قيمة التفعيل غير صحيحة')
      return { ok: true, value: { action: 'set_active', chemist_id, active: b.active } }
    }
    default:
      return fail('إجراء غير معروف')
  }
}
