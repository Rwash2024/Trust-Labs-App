import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getTripByToken } from '../lib/chemistApi'
import { viewModel, formatVisitDate, STALE_NOTE } from '../lib/trackVisitView'
import './TrackVisit.css'

const TrackMap = lazy(() => import('../components/TrackMap'))
const POLL_MS = 15000
const HOTLINE = '16183'

function updatedText(min) {
  if (min === null) return 'بنحدد مكان الكيميائي…'
  if (min <= 0) return 'آخر تحديث: لسه حالاً'
  return `آخر تحديث من ${min.toLocaleString('ar-EG')} دقيقة`
}

function CallButton() {
  return (
    <a className="tv__call" href={`tel:${HOTLINE}`}>
      اتصل بينا {HOTLINE}
    </a>
  )
}

export default function TrackVisit() {
  const { token } = useParams()
  const [trip, setTrip] = useState(undefined) // undefined = loading, null = invalid
  const [netError, setNetError] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const finished = useRef(false)

  useEffect(() => {
    const prevTitle = document.title
    document.title = 'تتبع الكيميائي — معامل ترست'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.title = prevTitle
      meta.remove()
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const data = await getTripByToken(token)
      setTrip(data ?? null)
      setNetError(false)
      setNow(new Date())
      if (!data || data.status === 'arrived') finished.current = true
    } catch {
      setNetError(true)
      setNow(new Date())
    }
  }, [token])

  useEffect(() => {
    finished.current = false
    let cancelled = false
    let inFlight = false
    const run = async () => {
      if (cancelled || inFlight || finished.current) return
      inFlight = true
      try {
        await load()
      } finally {
        inFlight = false
      }
    }
    run()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') run()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  if (trip === undefined) {
    return (
      <main className="tv">
        <div role="status">
          <p className="tv__loading">{netError ? 'مش قادرين نحدّث دلوقتي، هنحاول تاني' : 'جاري التحميل…'}</p>
        </div>
        {netError && <CallButton />}
      </main>
    )
  }

  const vm = viewModel(trip, now)

  if (vm.kind === 'invalid') {
    return (
      <main className="tv">
        <section className="tv__card">
          <div role="status">
            <h1 className="tv__headline">{vm.headline}</h1>
          </div>
          <p className="tv__line">لو محتاج مساعدة كلّمنا</p>
          <CallButton />
        </section>
      </main>
    )
  }

  const date = formatVisitDate(trip.preferred_date)
  const showWaitingForPing = vm.kind === 'on_way' && vm.updatedMin === null

  return (
    <main className="tv">
      <section className="tv__card">
        <div role="status" aria-live="polite">
          <h1 className={`tv__headline tv__headline--${vm.kind}`}>{vm.headline}</h1>
          {vm.eta && (
            <p className="tv__eta">
              حوالي {vm.eta.min.toLocaleString('ar-EG')}–{vm.eta.max.toLocaleString('ar-EG')} دقيقة
            </p>
          )}
        </div>

        {vm.kind === 'on_way' && (
          <p className="tv__updated">{showWaitingForPing ? updatedText(null) : updatedText(vm.updatedMin)}</p>
        )}
        {vm.stale && <p className="tv__note tv__note--warn">{STALE_NOTE}</p>}
        {netError && <p className="tv__note">مش قادرين نحدّث دلوقتي، هنحاول تاني</p>}

        {vm.kind === 'on_way' && vm.markers.length > 0 && (
          <div className="tv__map">
            <Suspense fallback={<div className="tv__map-fallback" />}>
              <TrackMap markers={vm.markers} height={260} />
            </Suspense>
          </div>
        )}

        <ol className="tv__steps" aria-label="مراحل الزيارة">
          {vm.steps.map((s) => (
            <li key={s.key} className={`tv__step${s.done ? ' is-done' : ''}${s.current ? ' is-current' : ''}`} aria-current={s.current ? 'step' : undefined}>
              <span className="tv__dot" aria-hidden="true">{s.done ? '✓' : ''}</span>
              <span className="tv__step-label">{s.label}</span>
            </li>
          ))}
        </ol>

        <dl className="tv__info">
          {trip.chemist_first_name && (
            <div className="tv__info-row">
              <dt>الكيميائي</dt>
              <dd>{trip.chemist_first_name}</dd>
            </div>
          )}
          {date && (
            <div className="tv__info-row">
              <dt>ميعاد الزيارة</dt>
              <dd>{date}</dd>
            </div>
          )}
        </dl>

        <CallButton />
      </section>
    </main>
  )
}
