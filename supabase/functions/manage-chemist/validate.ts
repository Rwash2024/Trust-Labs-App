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

// Phone kept on an archived chemist's row: frees the unique number for a new
// account while staying readable in the database.
export function archivedPhone(phone: string, chemistId: string): string {
  return `archived-${chemistId.slice(0, 8)}-${phone}`
}

// The client resizes to a ~480px JPEG (well under 200 KB); 1 MB is the bucket cap.
export const MAX_PHOTO_BYTES = 1024 * 1024
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/

export function decodeJpegBase64(input: unknown): { ok: true; bytes: Uint8Array } | { ok: false; error: string } {
  const notJpeg = { ok: false as const, error: 'الصورة لازم تكون JPG' }
  if (typeof input !== 'string') return notJpeg
  const b64 = input.replace(/^data:image\/jpeg;base64,/, '')
  if (!b64) return notJpeg
  // 4 base64 chars -> 3 bytes; reject before decoding anything huge.
  if ((b64.length * 3) / 4 > MAX_PHOTO_BYTES + 3) return { ok: false, error: 'الصورة كبيرة، اختار صورة أصغر' }
  if (b64.length % 4 !== 0 || !BASE64_REGEX.test(b64)) return notJpeg
  const bin = atob(b64)
  if (bin.length > MAX_PHOTO_BYTES) return { ok: false, error: 'الصورة كبيرة، اختار صورة أصغر' }
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return notJpeg
  return { ok: true, bytes }
}

export type ChemistInput =
  | { action: 'create'; name: string; phone: string; password: string }
  | { action: 'reset_password'; chemist_id: string; password: string }
  | { action: 'set_active'; chemist_id: string; active: boolean }
  | { action: 'update'; chemist_id: string; name: string; phone: string }
  | { action: 'set_photo'; chemist_id: string; image: Uint8Array }
  | { action: 'remove_photo'; chemist_id: string }
  | { action: 'delete'; chemist_id: string }

export type ValidationResult = { ok: true; value: ChemistInput } | { ok: false; error: string }

const fail = (error: string): ValidationResult => ({ ok: false, error })

export function validateChemistInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('طلب غير صالح')
  const b = body as Record<string, unknown>

  const checkPassword = (): string | null =>
    typeof b.password === 'string' && b.password.length >= 8 && b.password.length <= 72 ? b.password : null
  const checkId = (): string | null =>
    typeof b.chemist_id === 'string' && UUID_REGEX.test(b.chemist_id) ? b.chemist_id : null

  const checkName = (): string | null => {
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    return name.length >= 2 && name.length <= 60 ? name : null
  }
  const BAD_NAME = 'الاسم لازم يكون من 2 إلى 60 حرف'
  const BAD_PHONE = 'رقم الموبايل غير صحيح'
  const BAD_ID = 'معرّف الكيميائي غير صحيح'

  switch (b.action) {
    case 'create': {
      const name = checkName()
      if (!name) return fail(BAD_NAME)
      const phone = normalizeEgyptPhone(b.phone)
      if (!phone) return fail(BAD_PHONE)
      const password = checkPassword()
      if (!password) return fail('كلمة السر لازم تكون 8 أحرف على الأقل')
      return { ok: true, value: { action: 'create', name, phone, password } }
    }
    case 'reset_password': {
      const chemist_id = checkId()
      if (!chemist_id) return fail(BAD_ID)
      const password = checkPassword()
      if (!password) return fail('كلمة السر لازم تكون 8 أحرف على الأقل')
      return { ok: true, value: { action: 'reset_password', chemist_id, password } }
    }
    case 'set_active': {
      const chemist_id = checkId()
      if (!chemist_id) return fail(BAD_ID)
      if (typeof b.active !== 'boolean') return fail('قيمة التفعيل غير صحيحة')
      return { ok: true, value: { action: 'set_active', chemist_id, active: b.active } }
    }
    case 'update': {
      const chemist_id = checkId()
      if (!chemist_id) return fail(BAD_ID)
      const name = checkName()
      if (!name) return fail(BAD_NAME)
      const phone = normalizeEgyptPhone(b.phone)
      if (!phone) return fail(BAD_PHONE)
      return { ok: true, value: { action: 'update', chemist_id, name, phone } }
    }
    case 'set_photo': {
      const chemist_id = checkId()
      if (!chemist_id) return fail(BAD_ID)
      const decoded = decodeJpegBase64(b.image)
      if (!decoded.ok) return fail(decoded.error)
      return { ok: true, value: { action: 'set_photo', chemist_id, image: decoded.bytes } }
    }
    case 'remove_photo':
    case 'delete': {
      const chemist_id = checkId()
      if (!chemist_id) return fail(BAD_ID)
      return { ok: true, value: { action: b.action, chemist_id } }
    }
    default:
      return fail('إجراء غير معروف')
  }
}

// Maps an auth.admin.createUser / updateUserById error to an HTTP response.
// Branches on the error code, not on status: GoTrue answers 422 for several
// different problems (duplicate email, weak password, ...).
export function mapAuthAdminError(err: { code?: string; message?: string } | null | undefined): { status: number; error: string } {
  const code = err?.code ?? ''
  const msg = `${err?.message ?? ''}`.toLowerCase()
  if (code === 'email_exists' || code === 'user_already_exists' || msg.includes('already')) {
    return { status: 409, error: 'رقم الموبايل ده مسجل قبل كده' }
  }
  if (code === 'weak_password') {
    return { status: 400, error: 'الباسورد ضعيف، استخدم 8 حروف وأرقام على الأقل ومتكررش رقم بسيط' }
  }
  return { status: 500, error: 'حصل خطأ غير متوقع، حاول تاني' }
}
