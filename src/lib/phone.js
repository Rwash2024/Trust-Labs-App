// One place for every phone-number check in the app (booking, complaints,
// rate-visit, trust card, sample tracking, chat, admin).
//
// "Valid" here means two things:
//   1. the format is a real Egyptian mobile number (01 + 0/1/2/5 + 8 digits),
//      or for international patients a plausible E.164-length number;
//   2. it isn't an obvious placeholder: 01000000000, 01012345678, 01212121212…
//
// This can't prove the number belongs to the person typing it — only an SMS
// code (OTP) can do that. It stops typos and throwaway fakes.
// The same rules are mirrored server-side in supabase/phone_validation_migration.sql;
// keep the two in sync.

export const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/

// Arabic-Indic (٠-٩) and Persian (۰-۹) digits → ASCII, so a patient typing on
// an Arabic keyboard doesn't have every digit silently stripped.
export function normalizeDigits(text) {
  return String(text ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}

// For onChange handlers on Egyptian phone inputs: keep digits only, drop a
// pasted +20 / 0020 country code, cap at 11 digits.
export function cleanEgyptPhoneInput(value) {
  let digits = normalizeDigits(value).replace(/\D/g, '')
  if (digits.startsWith('0020')) digits = digits.slice(4)
  else if (digits.startsWith('20') && digits.length > 11) digits = digits.slice(2)
  if (digits.startsWith('1') && digits.length === 10) digits = `0${digits}`
  return digits.slice(0, 11)
}

// For onChange handlers on international phone inputs: digits plus one leading +.
export function cleanInternationalPhoneInput(value) {
  const text = normalizeDigits(value).trim()
  const digits = text.replace(/\D/g, '').slice(0, 15)
  return text.startsWith('+') ? `+${digits}` : digits
}

// True when the digits are a filler pattern rather than a real subscriber number.
function looksFake(digits) {
  if (/^(\d)\1+$/.test(digits)) return true // 00000000
  if (/(\d)\1{6,}/.test(digits)) return true // seven or more of the same digit in a row
  if (/^(\d\d)\1{3,}$/.test(digits)) return true // 12121212
  if (digits.length >= 8 && digits === digits.slice(0, 3).repeat(6).slice(0, digits.length)) return true // 12312312
  const ascending = '01234567890123456789'
  const descending = '98765432109876543210'
  if (ascending.includes(digits) || descending.includes(digits)) return true // 12345678, 87654321
  return false
}

// Returns an Arabic error message, or '' when the number is fine.
export function egyptPhoneError(value) {
  const digits = cleanEgyptPhoneInput(value)
  if (!digits) return 'اكتب رقم الموبايل'
  if (!EGYPT_PHONE_REGEX.test(digits)) return 'لازم يكون رقم موبايل مصري صحيح (11 رقم، يبدأ بـ 010 أو 011 أو 012 أو 015)'
  if (looksFake(digits.slice(3))) return 'الرقم ده شكله مش حقيقي، اكتب رقم موبايلك الصحيح'
  return ''
}

export function isValidEgyptPhone(value) {
  return egyptPhoneError(value) === ''
}

// Returns an English error message, or '' when the number is fine.
// Egyptian numbers typed into the international forms get the full Egyptian rules.
export function internationalPhoneError(value) {
  const text = normalizeDigits(value).trim()
  const digits = text.replace(/\D/g, '')
  if (!digits) return 'Please enter your phone number.'
  if (/^(0020|20|\+20)/.test(text.replace(/\s/g, '')) || /^01/.test(digits)) {
    return isValidEgyptPhone(digits) ? '' : 'Please enter a valid Egyptian mobile number (01xxxxxxxxx).'
  }
  if (digits.length < 8 || digits.length > 15) return 'Please enter a valid phone number (8–15 digits, with country code).'
  if (looksFake(digits.slice(-8))) return 'This doesn’t look like a real phone number — please check it.'
  return ''
}

export function isValidInternationalPhone(value) {
  return internationalPhoneError(value) === ''
}
