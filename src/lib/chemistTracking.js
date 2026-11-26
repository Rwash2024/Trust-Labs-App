// Pure helpers for chemist live tracking (no React, no Supabase), so screens
// and tests can share them. ETA is a rough straight-line estimate.
import { cleanEgyptPhoneInput, EGYPT_PHONE_REGEX } from './phone.js'

const EARTH_RADIUS_M = 6371000
const DETOUR_FACTOR = 1.4 // straight line -> rough road distance
const SPEED_KMH = 25 // average city speed
const ETA_STEP_MIN = 5
const STALE_AFTER_MIN = 5 // staff: no ping for this long
const LONG_AFTER_MIN = 60 // staff: on the way for longer than this

const toRad = (deg) => (deg * Math.PI) / 180

export function haversineM(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

// Minutes as a 5-minute-wide range, e.g. 10..15. Never below 5.
export function etaRange(from, to) {
  if (!from || !to) return null
  const minutes = ((haversineM(from, to) / 1000) * DETOUR_FACTOR * 60) / SPEED_KMH
  const min = Math.max(ETA_STEP_MIN, Math.floor(minutes / ETA_STEP_MIN) * ETA_STEP_MIN)
  return { min, max: min + ETA_STEP_MIN }
}

export function minutesSince(iso, now) {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)
}

// Any common way of writing an Egyptian mobile -> 01XXXXXXXXX, else null.
export function normalizeEgyptPhone(input) {
  const digits = cleanEgyptPhoneInput(input)
  return EGYPT_PHONE_REGEX.test(digits) ? digits : null
}

export function chemistEmailFromPhone(input) {
  const phone = normalizeEgyptPhone(input)
  return phone ? `${phone}@chemist.local` : null
}

export function trackUrl(origin, token) {
  return `${origin}/t/${token}`
}

export function whatsAppUrl(phone, link, chemistFirstName) {
  const normalized = normalizeEgyptPhone(phone)
  if (!normalized) return null
  const name = chemistFirstName ? `${chemistFirstName} ` : ''
  const text = `أهلاً 👋 الكيميائي ${name}اتحدد لزيارتك من معامل ترست. تقدر تتابع وصوله من اللينك ده: ${link}`
  return `https://wa.me/20${normalized.slice(1)}?text=${encodeURIComponent(text)}`
}

// Cairo calendar date (YYYY-MM-DD) for the given instant.
function cairoDate(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(now)
}

export function attentionFlags(visit, now) {
  const flags = []
  if (visit.trip_status === 'on_way') {
    const lastSeen = visit.last_ping_at ?? visit.trip_started_at
    if (lastSeen && minutesSince(lastSeen, now) >= STALE_AFTER_MIN) flags.push('stale')
    if (visit.trip_started_at && minutesSince(visit.trip_started_at, now) > LONG_AFTER_MIN) flags.push('long')
  } else if (visit.trip_status === 'assigned' && visit.preferred_date === cairoDate(now)) {
    flags.push('not_started')
  }
  return flags
}

// Lower = more urgent.
export function attentionRank(flags) {
  if (flags.includes('stale')) return 0
  if (flags.includes('long')) return 1
  if (flags.includes('not_started')) return 2
  return 3
}
