import { useState } from 'react'
import { arrive, startTrip } from '../../lib/chemistApi'
import { normalizeEgyptPhone } from '../../lib/chemistTracking'
import { visitAction, testsCount, mapsUrl, dayLabel } from '../../lib/chemistView'
import { IconCar, IconCheck, IconClock, IconMap, IconPhone, IconRefresh, IconTests, IconWarning } from './ChemistIcons'

function testsLabel(count) {
  if (count <= 0) return 'التحاليل مش محددة'
  if (count === 1) return 'تحليل واحد'
  if (count === 2) return 'تحليلين'
  return `${count} ${count <= 10 ? 'تحاليل' : 'تحليل'}`
}

const STATUS = {
  assigned: { word: 'لسه ما اتحركتش', Icon: IconClock, tone: 'idle' },
  on_way: { word: 'في الطريق', Icon: IconCar, tone: 'ok' },
  arrived: { word: 'وصلت', Icon: IconCheck, tone: 'ok' },
}

export function VisitStatus({ status }) {
  const s = STATUS[status]
  if (!s) return null
  return (
    <span className={`chemist__status chemist__status--${s.tone}`}>
      <s.Icon size={18} />
      {s.word}
    </span>
  )
}

export function VisitDetails({ visit, now = new Date() }) {
  const count = testsCount(visit.tests)
  const map = mapsUrl(visit)
  const phone = normalizeEgyptPhone(visit.phone) ?? visit.phone
  return (
    <>
      <div className="chemist__card-top">
        <h2 className="chemist__name">{visit.name}</h2>
        <VisitStatus status={visit.trip_status} />
      </div>
      {visit.address && <p className="chemist__address">{visit.address}</p>}
      <ul className="chemist__meta">
        {visit.preferred_date && (
          <li>
            <IconClock size={18} />
            {dayLabel(visit.preferred_date, now)}
          </li>
        )}
        <li>
          <IconTests size={18} />
          {testsLabel(count)}
        </li>
      </ul>
      {visit.notes && (
        <p className="chemist__notes">
          <strong>ملاحظات: </strong>
          {visit.notes}
        </p>
      )}
      <div className="chemist__links">
        {map && (
          <a className="chemist__btn chemist__btn--secondary" href={map} target="_blank" rel="noopener noreferrer">
            <IconMap />
            افتح الطريق في جوجل ماب
          </a>
        )}
        {phone && (
          <a className="chemist__btn chemist__btn--ghost" href={`tel:${phone}`}>
            <IconPhone />
            <span>
              اتصل بالعميل <bdi dir="ltr">{phone}</bdi>
            </span>
          </a>
        )}
      </div>
    </>
  )
}

function VisitCard({ visit, onStarted, onArrived }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const action = visitAction(visit)

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const handleStart = () =>
    run(async () => {
      await startTrip(visit.id)
      await onStarted(visit.id)
    })
  const handleArrive = () =>
    run(async () => {
      await arrive(visit.id)
      await onArrived()
    })

  return (
    <li className="chemist__card">
      <VisitDetails visit={visit} />
      {error && (
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <IconWarning />
          <span>{error}</span>
        </p>
      )}
      {action === 'start' && (
        <button type="button" className="chemist__btn chemist__btn--primary" onClick={handleStart} disabled={busy}>
          <IconCar />
          {busy ? 'لحظة...' : 'أنا في الطريق'}
        </button>
      )}
      {action === 'arrive' && (
        <button type="button" className="chemist__btn chemist__btn--primary" onClick={handleArrive} disabled={busy}>
          <IconCheck />
          {busy ? 'لحظة...' : 'وصلت'}
        </button>
      )}
    </li>
  )
}

export default function ChemistVisits({ visits, loading, error, onReload, onStarted }) {
  return (
    <div className="chemist__body">
      <div className="chemist__toolbar">
        <p className="chemist__muted">زيارات النهارده واللي جاية</p>
        <button type="button" className="chemist__icon-btn" onClick={onReload} disabled={loading}>
          <IconRefresh size={20} />
          <span>تحديث</span>
        </button>
      </div>

      {error && (
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <IconWarning />
          <span>{error}</span>
        </p>
      )}

      {visits === null && loading && (
        <p className="chemist__loading" role="status">
          جاري تحميل الزيارات...
        </p>
      )}

      {visits && visits.length === 0 && !error && <p className="chemist__empty">مفيش زيارات ليك دلوقتي.</p>}

      {visits && visits.length > 0 && (
        <ul className="chemist__list">
          {visits.map((v) => (
            <VisitCard key={v.id} visit={v} onStarted={onStarted} onArrived={onReload} />
          ))}
        </ul>
      )}
    </div>
  )
}
