import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TrackMap from '../../components/TrackMap'
import { listLiveTrips, subscribeLiveTrips } from '../../lib/chemistApi'
import { attentionFlags, attentionRank, minutesSince, trackUrl, whatsAppUrl } from '../../lib/chemistTracking'

const REFRESH_MS = 30000 // flag re-evaluation + fallback poll (the subscription has no status callback)
const DEBOUNCE_MS = 1000 // the bookings UPDATE subscription is unfiltered

const ICON_PATHS = {
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  alert: <path d="M12 4l9 16H3L12 4zM12 10v4M12 17.2v.1" />,
  dash: <path d="M6 12h12" />,
  nav: <path d="M12 3l7 17-7-4-7 4 7-17z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </>
  ),
}

function BadgeIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

const cairoDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d)

// Minutes, never NaN or negative (clock skew / bad dates).
function safeMinutes(iso, now) {
  if (!iso) return 0
  const m = minutesSince(iso, now)
  return Number.isFinite(m) && m > 0 ? m : 0
}

function validPosition(t) {
  if (t.last_lat == null || t.last_lng == null) return null
  const lat = Number(t.last_lat)
  const lng = Number(t.last_lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

function badgesFor(trip, flags, now) {
  const badges = []
  if (flags.includes('stale')) {
    const n = safeMinutes(trip.last_ping_at ?? trip.trip_started_at, now)
    badges.push({ key: 'stale', tone: 'warn', icon: 'clock', label: `التتبع متوقف ${n} د` })
  }
  if (flags.includes('long')) badges.push({ key: 'long', tone: 'warn', icon: 'alert', label: 'رحلة طويلة' })
  if (flags.includes('not_started')) badges.push({ key: 'not_started', tone: 'warn', icon: 'dash', label: 'لسه ما اتحركش' })
  if (trip.trip_status === 'on_way') badges.push({ key: 'on_way', tone: 'live', icon: 'nav', label: 'في الطريق' })
  else if (trip.trip_status === 'arrived') badges.push({ key: 'arrived', tone: 'done', icon: 'check', label: 'وصل' })
  else if (!flags.length) badges.push({ key: 'assigned', tone: 'ok', icon: 'user', label: 'اتحدد الكيميائي' })
  return badges
}

export default function LiveTrackingTab() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [sendError, setSendError] = useState('')
  const reqId = useRef(0)

  // Only the first load shows the loading state; later reloads are silent so
  // the map and list stay mounted.
  const load = useCallback(() => {
    const id = ++reqId.current
    listLiveTrips()
      .then((rows) => {
        if (id !== reqId.current) return
        setTrips(rows)
        setError('')
        setNow(new Date())
      })
      .catch((e) => {
        if (id === reqId.current) setError(e.message)
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    const reqRef = reqId
    load()
    const poll = setInterval(load, REFRESH_MS)
    const tick = setInterval(() => setNow(new Date()), REFRESH_MS)
    let timer = null
    let active = true
    const onChange = () => {
      if (!active) return
      clearTimeout(timer)
      timer = setTimeout(load, DEBOUNCE_MS)
    }
    let unsubscribe = null
    try {
      unsubscribe = subscribeLiveTrips(onChange)
    } catch {
      // No realtime: the 30 s poll keeps the board fresh.
    }
    return () => {
      active = false
      clearInterval(poll)
      clearInterval(tick)
      clearTimeout(timer)
      reqRef.current++
      unsubscribe?.()
    }
  }, [load])

  const rows = useMemo(
    () =>
      trips
        .filter((t) => t.trip_status !== 'cancelled')
        .map((t) => ({ trip: t, flags: attentionFlags(t, now) }))
        .sort(
          (a, b) =>
            attentionRank(a.flags) - attentionRank(b.flags) ||
            (a.trip.chemist_name ?? '').localeCompare(b.trip.chemist_name ?? '', 'ar'),
        ),
    [trips, now],
  )

  // Serialise, then parse under the string key: the array identity only
  // changes when a pin really changes, so the map is not rebuilt every tick.
  const markerKey = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter(({ trip }) => trip.trip_status === 'on_way')
          .map(({ trip, flags }) => {
            const pos = validPosition(trip)
            return pos
              ? {
                  id: trip.id,
                  lat: pos.lat,
                  lng: pos.lng,
                  kind: 'chemist',
                  label: trip.chemist_name || 'كيميائي',
                  tone: flags.includes('stale') ? 'warn' : 'ok',
                }
              : null
          })
          .filter(Boolean),
      ),
    [rows],
  )
  const markers = useMemo(() => JSON.parse(markerKey), [markerKey])

  const today = cairoDate(now)
  const onWayCount = rows.filter((r) => r.trip.trip_status === 'on_way').length
  const attentionCount = rows.filter((r) => r.flags.length > 0).length
  const arrivedToday = rows.filter(
    (r) => r.trip.trip_status === 'arrived' && r.trip.trip_arrived_at && cairoDate(new Date(r.trip.trip_arrived_at)) === today,
  ).length

  const handleSend = (trip) => {
    setSendError('')
    const firstName = trip.chemist_name?.trim().split(/\s+/)[0]
    const url = whatsAppUrl(trip.phone, trackUrl(window.location.origin, trip.track_token), firstName)
    if (!url) {
      setSendError('رقم الموبايل مش صالح للواتساب')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // Announce only when the counts change (not on every 30 s tick).
  const summary = `${onWayCount} في الطريق، ${attentionCount} محتاج تدخّل، ${arrivedToday} وصلوا النهارده`
  const [announced, setAnnounced] = useState('')
  if (!loading && announced !== summary) setAnnounced(summary)

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div className="live-board">
      <div className="admin-toolbar">
        <h2>التتبع المباشر</h2>
      </div>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {sendError && (
        <p className="admin-error" role="alert">
          {sendError}
        </p>
      )}

      <p className="live-board__sr" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </p>

      <div className="live-board__summary">
        <div className="live-board__counter">
          <strong>{onWayCount}</strong>
          <span>في الطريق</span>
        </div>
        <div className={`live-board__counter${attentionCount ? ' live-board__counter--warn' : ''}`}>
          <strong>{attentionCount}</strong>
          <span>محتاج تدخّل</span>
        </div>
        <div className="live-board__counter">
          <strong>{arrivedToday}</strong>
          <span>وصلوا النهارده</span>
        </div>
      </div>

      {markers.length > 0 ? (
        <div className="live-board__map">
          <TrackMap markers={markers} height={320} />
        </div>
      ) : (
        <p className="live-board__empty">مفيش كيميائي في الطريق دلوقتي</p>
      )}

      {rows.length === 0 ? (
        <p className="live-board__empty">مفيش زيارات متحددة لكيميائيين النهارده</p>
      ) : (
        <ul className="live-board__list">
          {rows.map(({ trip, flags }) => (
            <li key={trip.id} className="live-board__row">
              <div className="live-board__main">
                <div className="live-board__badges">
                  {badgesFor(trip, flags, now).map((b) => (
                    <span key={b.key} className={`trip-badge trip-badge--${b.tone}`}>
                      <BadgeIcon name={b.icon} />
                      {b.label}
                    </span>
                  ))}
                </div>
                <strong className="live-board__name">{trip.name}</strong>
                <span className="live-board__meta">الكيميائي: {trip.chemist_name || 'مش محدد'}</span>
                {trip.address && <span className="live-board__meta">{trip.address}</span>}
              </div>
              {trip.track_token && trip.trip_status !== 'arrived' && (
                <button type="button" className="admin-btn admin-btn--sm live-board__btn" onClick={() => handleSend(trip)}>
                  ابعت لينك التتبع
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
