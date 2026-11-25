import { useEffect, useRef, useState } from 'react'
import { arrive, cancelTrip, sendPing } from '../../lib/chemistApi'
import { createLocationSource, locationSourceKind } from '../../lib/chemistLocation'
import { trackUrl, whatsAppUrl } from '../../lib/chemistTracking'
import { tripScreenWarning } from '../../lib/chemistView'
import { VisitDetails } from './ChemistVisits'
import { IconCheck, IconShare, IconSignal, IconWarning } from './ChemistIcons'

const WARNINGS = {
  no_permission: 'فعّل الموقع من إعدادات المتصفح عشان العميل يشوفك',
  not_sending: 'الموقع مش بيتبعت، اتأكد من النت والـ GPS',
}

function sinceText(iso, now) {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `آخر إرسال من ${seconds} ثانية`
  return `آخر إرسال من ${Math.floor(seconds / 60)} دقيقة`
}

// Live browser permission state; 'prompt' when the Permissions API is missing.
function useGeoPermission() {
  const [permission, setPermission] = useState('prompt')
  useEffect(() => {
    let status = null
    let cancelled = false
    const onChange = () => setPermission(status.state)
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((s) => {
        if (cancelled) return
        status = s
        setPermission(s.state)
        s.addEventListener?.('change', onChange)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      status?.removeEventListener?.('change', onChange)
    }
  }, [])
  return [permission, setPermission]
}

export default function ChemistTrip({ visit, onDone }) {
  const [permission, setPermission] = useGeoPermission()
  const [lastSentAt, setLastSentAt] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [startedAt] = useState(() => new Date().toISOString())
  const [now, setNow] = useState(() => new Date())
  const [sourceKind] = useState(locationSourceKind)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const sourceRef = useRef(null)

  // Location source lives exactly as long as this screen: it stops on
  // arrive / cancel / logout (all unmount the screen) and on unmount.
  useEffect(() => {
    let alive = true
    const source = createLocationSource({
      onFix: (fix) => {
        setPermission('granted')
        sendPing(visit.id, fix)
          .then(() => {
            if (!alive) return
            setLastSentAt(new Date().toISOString())
            setLastError(null)
          })
          .catch((e) => {
            if (alive) setLastError(e.message || 'error')
          })
      },
      onError: (err) => {
        if (err.code === 1) setPermission('denied')
        else setLastError(err.message || 'gps')
      },
    })
    sourceRef.current = source
    source.start()
    return () => {
      alive = false
      source.stop()
      sourceRef.current = null
    }
  }, [visit.id, setPermission])

  // Permission turned back on in settings: a denied watch is dead, restart it.
  const prevPermission = useRef(permission)
  useEffect(() => {
    if (prevPermission.current === 'denied' && permission === 'granted') {
      sourceRef.current?.stop()
      sourceRef.current?.start()
    }
    prevPermission.current = permission
  }, [permission])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const warning = tripScreenWarning({ permission, lastSentAt, lastError, startedAt }, now)

  const finish = async (fn) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      sourceRef.current?.stop()
      onDone()
    } catch (e) {
      setActionError(e.message)
      setBusy(false)
    }
  }

  const link = visit.track_token ? trackUrl(window.location.origin, visit.track_token) : null
  const wa = link ? whatsAppUrl(visit.phone, link) : null

  return (
    <div className="chemist__body chemist__trip">
      <div className="chemist__banner">
        <IconSignal size={26} />
        <div>
          <p className="chemist__banner-title">جاري مشاركة موقعك مع العميل</p>
          <p className="chemist__banner-sub" role="status">
            {lastSentAt ? sinceText(lastSentAt, now) : 'بنحدد موقعك...'}
          </p>
        </div>
      </div>

      {warning && (
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <IconWarning />
          <span>{WARNINGS[warning]}</span>
        </p>
      )}

      {sourceKind === 'browser' && <p className="chemist__hint">سيب الصفحة دي مفتوحة والشاشة منوّرة</p>}

      <section className="chemist__card" aria-label="بيانات الزيارة">
        <VisitDetails visit={visit} now={now} />
      </section>

      {actionError && (
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <IconWarning />
          <span>{actionError}</span>
        </p>
      )}

      <button
        type="button"
        className="chemist__btn chemist__btn--primary chemist__btn--big"
        onClick={() => finish(() => arrive(visit.id))}
        disabled={busy}
      >
        <IconCheck />
        {busy ? 'لحظة...' : 'وصلت'}
      </button>

      {wa && (
        <a className="chemist__btn chemist__btn--secondary" href={wa} target="_blank" rel="noopener noreferrer">
          <IconShare />
          ابعت لينك التتبع
        </a>
      )}

      <button
        type="button"
        className="chemist__btn chemist__btn--danger"
        onClick={() => setConfirmCancel(true)}
        disabled={busy}
      >
        إلغاء الرحلة
      </button>

      {confirmCancel && (
        <ConfirmDialog
          title="إلغاء الرحلة؟"
          body="العميل هيبطّل يشوف موقعك، والزيارة هترجع لقايمتك."
          confirmLabel="أيوه، إلغاء الرحلة"
          cancelLabel="لأ، كمّل"
          busy={busy}
          onConfirm={() => finish(() => cancelTrip(visit.id, false))}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, busy, onConfirm, onCancel }) {
  const cancelRef = useRef(null)
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="chemist__overlay">
      <div
        className="chemist__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chemist-dialog-title"
        aria-describedby="chemist-dialog-body"
      >
        <h2 id="chemist-dialog-title" className="chemist__dialog-title">
          {title}
        </h2>
        <p id="chemist-dialog-body">{body}</p>
        <button type="button" className="chemist__btn chemist__btn--danger-solid" onClick={onConfirm} disabled={busy}>
          {busy ? 'لحظة...' : confirmLabel}
        </button>
        <button ref={cancelRef} type="button" className="chemist__btn chemist__btn--secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
