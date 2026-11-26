// Pure view-model for the public customer tracking page (/t/:token).
import { etaRange, minutesSince } from './chemistTracking.js'

const STALE_AFTER_MIN = 3 // customer threshold (staff uses 5)

export const HEADLINES = {
  invalid: 'اللينك ده مش شغال',
  waiting: 'هنبلّغك لما الكيميائي يتحرك',
  on_way: 'الكيميائي جاي في الطريق ليك',
  arrived: 'الكيميائي وصل',
}
export const STEP_LABELS = ['اتحدد الكيميائي', 'في الطريق', 'وصل']
export const STALE_NOTE = 'التحديث متأخر شوية، ممكن الشبكة ضعيفة'

const CURRENT_STEP = { waiting: 0, on_way: 1, arrived: 2 }

function buildSteps(kind) {
  const current = CURRENT_STEP[kind] ?? -1
  return STEP_LABELS.map((label, i) => ({
    key: ['assigned', 'on_way', 'arrived'][i],
    label,
    done: current >= 0 && i <= current,
    current: i === current,
  }))
}

const validPoint = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)

export function viewModel(trip, now) {
  const status = trip?.status
  const kind = status === 'assigned' ? 'waiting' : status === 'on_way' ? 'on_way' : status === 'arrived' ? 'arrived' : 'invalid'
  const vm = {
    kind,
    headline: HEADLINES[kind],
    steps: buildSteps(kind),
    eta: null,
    updatedMin: null,
    stale: false,
    markers: [],
  }
  if (kind !== 'on_way') return vm

  const last = validPoint(trip.last) ? trip.last : null
  const dest = validPoint(trip.dest) ? trip.dest : null
  if (last) {
    const raw = minutesSince(last.at, now)
    if (Number.isFinite(raw)) {
      vm.updatedMin = Math.max(0, raw)
      vm.stale = vm.updatedMin > STALE_AFTER_MIN - 1 // >= 3 minutes
      vm.markers.push({ id: 'chemist', lat: last.lat, lng: last.lng, kind: 'chemist', label: trip.chemist_first_name || 'الكيميائي', tone: vm.stale ? 'warn' : undefined })
      if (dest && !vm.stale) vm.eta = etaRange(last, dest)
    }
  }
  if (dest) vm.markers.push({ id: 'home', lat: dest.lat, lng: dest.lng, kind: 'home', label: 'بيتك' })
  return vm
}

// Never let the secret token reach analytics.
export function redactTrackUrl(url) {
  return String(url).replace(/\/t\/[^/?#]+.*$/i, '/t/[token]')
}

// '2026-11-25' -> «الأربعاء 25 نوفمبر»; '' when missing/invalid.
export function formatVisitDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const d = new Date(`${iso}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(d)
}
