import { useState } from 'react'
import { assignChemist, cancelTrip } from '../../lib/chemistApi'
import { trackUrl, whatsAppUrl } from '../../lib/chemistTracking'

// Each trip state: an icon AND a word (never colour alone) + a tone class.
const TRIP = {
  none: { label: 'لسه ما اتحددش', tone: 'idle', icon: 'dash' },
  assigned: { label: 'اتحدد الكيميائي', tone: 'ok', icon: 'user' },
  on_way: { label: 'في الطريق', tone: 'live', icon: 'nav' },
  arrived: { label: 'وصل', tone: 'done', icon: 'check' },
  cancelled: { label: 'اتلغت الرحلة', tone: 'warn', icon: 'x' },
}

const ICON_PATHS = {
  dash: <path d="M6 12h12" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </>
  ),
  nav: <path d="M12 3l7 17-7-4-7 4 7-17z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
}

function TripIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

function chemistOptionLabel(c) {
  return c.on_trip ? `${c.name} (في رحلة)` : `${c.name} (عنده ${c.today_count ?? 0} زيارة)`
}

export default function ChemistAssign({ booking, chemists, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // A cancelled trip keeps its chemist, but the badge must say so.
  const tripKey = booking.assigned_chemist_id || booking.trip_status ? booking.trip_status || 'assigned' : 'none'
  const trip = TRIP[tripKey] || TRIP.assigned
  const onWay = booking.trip_status === 'on_way'
  const chosen = chemists.find((c) => c.id === booking.assigned_chemist_id)
  const hasLink = !!(booking.assigned_chemist_id && booking.track_token) && booking.trip_status !== 'cancelled'
  const link = hasLink ? trackUrl(window.location.origin, booking.track_token) : ''
  const selectId = `chemist-${booking.id}`

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      await onChanged?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAssign = (e) => {
    const chemistId = e.target.value
    if (!chemistId || chemistId === booking.assigned_chemist_id) return
    run(() => assignChemist(booking.id, chemistId))
  }

  const handleCancel = () => {
    if (!window.confirm('تلغي الرحلة دلوقتي؟ الكيميائي في الطريق.')) return
    run(() => cancelTrip(booking.id, true))
  }

  const handleSend = () => {
    const firstName = chosen?.name?.trim().split(/\s+/)[0]
    const url = whatsAppUrl(booking.phone, link, firstName)
    if (!url) {
      setError('رقم الموبايل مش صالح للواتساب')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: show the link so it can be copied by hand.
      window.prompt('انسخ اللينك:', link)
    }
  }

  // The current chemist may be missing from the available list.
  const missingCurrent = booking.assigned_chemist_id && !chosen

  return (
    <div className="chemist-assign">
      <span className={`trip-badge trip-badge--${trip.tone}`}>
        <TripIcon name={trip.icon} />
        {trip.label}
      </span>

      <label className="chemist-assign__label" htmlFor={selectId}>
        الكيميائي
      </label>
      <select
        id={selectId}
        className="admin-select chemist-assign__select"
        value={booking.assigned_chemist_id || ''}
        onChange={handleAssign}
        disabled={busy || onWay}
      >
        <option value="" disabled>
          اختار كيميائي
        </option>
        {missingCurrent && <option value={booking.assigned_chemist_id}>الكيميائي الحالي</option>}
        {chemists.map((c) => (
          <option key={c.id} value={c.id}>
            {chemistOptionLabel(c)}
          </option>
        ))}
      </select>

      {chemists.length === 0 && <span className="chemist-assign__hint">مفيش كيميائيين متاحين</span>}

      {hasLink && (
        <div className="chemist-assign__actions">
          <button type="button" className="admin-btn admin-btn--sm chemist-assign__btn" onClick={handleSend} disabled={busy}>
            ابعت لينك التتبع
          </button>
          <button type="button" className="admin-btn admin-btn--sm chemist-assign__btn" onClick={handleCopy} disabled={busy}>
            {copied ? 'اتنسخ' : 'انسخ اللينك'}
          </button>
        </div>
      )}
      {onWay && (
        <button type="button" className="admin-btn admin-btn--sm admin-btn--danger chemist-assign__btn" onClick={handleCancel} disabled={busy}>
          إلغاء الرحلة
        </button>
      )}
      {error && (
        <p className="chemist-assign__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
