// Pure view helpers for the chemist screens (no React, no Supabase).

const NOT_SENDING_AFTER_MS = 2 * 60 * 1000

// The one primary action a visit card offers.
export function visitAction(visit) {
  if (visit?.trip_status === 'assigned') return 'start'
  if (visit?.trip_status === 'on_way') return 'arrive'
  return 'none'
}

// Warning for the trip screen.
// - lastError: the last sendPing failed -> warn now.
// - gpsError (a GPS read error, code 2) is accepted but never warns by itself:
//   only the "nothing sent for >2 min" rule applies. GPS timeouts (code 3)
//   are not reported at all.
// - startedAt (optional): when the location source started, so "nothing sent
//   yet" only warns after the same 2 minutes.
export function tripScreenWarning({ permission, lastSentAt, lastError, startedAt } = {}, now) {
  if (permission === 'denied') return 'no_permission'
  if (lastError) return 'not_sending'
  const since = lastSentAt ?? startedAt
  if (since && now.getTime() - new Date(since).getTime() > NOT_SENDING_AFTER_MS) return 'not_sending'
  return null
}

// bookings.tests is jsonb: usually an array, sometimes a string (JSON or a
// comma/Arabic-comma separated list). Count defensively.
export function testsCount(tests) {
  if (Array.isArray(tests)) return tests.length
  if (typeof tests !== 'string') return 0
  const text = tests.trim()
  if (!text) return 0
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed.length
  } catch {
    // not JSON, fall through to a plain list
  }
  return text.split(/[,،\n]/).filter((s) => s.trim()).length
}

const isNum = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))

// Directions to the patient: exact pin, else the patient's map link, else an
// address search. Only http(s) links are trusted.
export function mapsUrl(visit) {
  if (isNum(visit?.location_lat) && isNum(visit?.location_lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${Number(visit.location_lat)},${Number(visit.location_lng)}`
  }
  const link = visit?.location_link?.trim()
  if (link && /^https?:\/\//i.test(link)) return link
  const address = visit?.address?.trim()
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return null
}

function cairoDate(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(date)
}

// «النهارده» / «بكرة» / the date as given (preferred_date is YYYY-MM-DD).
export function dayLabel(preferredDate, now) {
  if (!preferredDate) return ''
  const day = String(preferredDate).slice(0, 10)
  if (day === cairoDate(now)) return 'النهارده'
  if (day === cairoDate(new Date(now.getTime() + 24 * 3600 * 1000))) return 'بكرة'
  return day
}
