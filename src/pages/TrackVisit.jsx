import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { chemistPhotoUrl, getTripByToken } from '../lib/chemistApi'
import { viewModel, formatVisitDate, STALE_NOTE } from '../lib/trackVisitView'
import { CheckIcon } from '../components/icons'
import './TrackVisit.css'

const TrackMap = lazy(() => import('../components/TrackMap'))
const POLL_MS = 15000
const HOTLINE = '16183'

function updatedText(min) {
  if (min === null) return 'بنحدد مكان الكيميائي…'
  if (min <= 0) return 'آخر تحديث: لسه حالاً'
  if (min === 1) return 'آخر تحديث من دقيقة'
  if (min === 2) return 'آخر تحديث من دقيقتين'
  if (min <= 10) return `آخر تحديث من ${min.toLocaleString('en-US')} دقايق`
  return `آخر تحديث من ${min.toLocaleString('en-US')} دقيقة`
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
  // Remount per token so state from a previous token can never show.
  return <TrackVisitInner key={token ?? ''} token={token} />
}

function TrackVisitInner({ token }) {
  const [trip, setTrip] = useState(token ? undefined : null) // undefined = loading, null = invalid
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

  useEffect(() => {
    if (!token) return undefined
    finished.current = false
    let cancelled = false
    let inFlight = false
    const run = async () => {
      if (cancelled || inFlight || finished.current) return
      inFlight = true
      try {
        const data = await getTripByToken(token)
        if (cancelled) return
        setTrip(data ?? null)
        setNetError(false)
        if (!data || data.status === 'arrived') finished.current = true
      } catch {
        if (cancelled) return
        setNetError(true)
      } finally {
        inFlight = false
        if (!cancelled) setNow(new Date())
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
  }, [token])

  const vm = useMemo(() => (trip === undefined ? null : viewModel(trip, now)), [trip, now])
  const loading = trip === undefined
  const invalid = vm?.kind === 'invalid'
  const date = trip ? formatVisitDate(trip.preferred_date) : ''
  const photoUrl = trip ? chemistPhotoUrl(trip.chemist_photo) : null
  const retryLine = 'مش قادرين نحدّث دلوقتي، هنحاول تاني'

  return (
    <main className="tv">
      <section className="tv__card">
        <div role="status" aria-live="polite">
          {loading ? (
            <p className="tv__loading">{netError ? retryLine : 'جاري التحميل…'}</p>
          ) : (
            <>
              <h1 className={`tv__headline tv__headline--${vm.kind}`}>{vm.headline}</h1>
              {vm.eta && (
                <p className="tv__eta">
                  حوالي {vm.eta.min.toLocaleString('en-US')}–{vm.eta.max.toLocaleString('en-US')} دقيقة
                </p>
              )}
            </>
          )}
        </div>

        {invalid && <p className="tv__line">لو محتاج مساعدة كلّمنا</p>}
        {!loading && vm.kind === 'on_way' && <p className="tv__updated">{updatedText(vm.updatedMin)}</p>}
        {!loading && vm.stale && <p className="tv__note tv__note--warn">{STALE_NOTE}</p>}
        {!loading && netError && <p className="tv__note">{retryLine}</p>}

        {!loading && !invalid && vm.kind === 'on_way' && vm.markers.length > 0 && (
          <div className="tv__map">
            <Suspense fallback={<div className="tv__map-fallback" />}>
              <TrackMap markers={vm.markers} height={260} />
            </Suspense>
          </div>
        )}

        {!loading && !invalid && (
          <ol className="tv__steps" aria-label="مراحل الزيارة">
            {vm.steps.map((s) => (
              <li key={s.key} className={`tv__step${s.done ? ' is-done' : ''}${s.current ? ' is-current' : ''}`} aria-current={s.current ? 'step' : undefined}>
                <span className="tv__dot" aria-hidden="true">{s.done ? <CheckIcon width={16} height={16} /> : null}</span>
                <span className="tv__step-label">{s.label}</span>
                {s.done && <span className="tv__sr">تم</span>}
              </li>
            ))}
          </ol>
        )}

        {!loading && !invalid && (trip.chemist_first_name || date) && (
          <dl className="tv__info">
            {trip.chemist_first_name && (
              <div className="tv__info-row">
                <dt>الكيميائي</dt>
                <dd className="tv__chemist">
                  {photoUrl && <img className="tv__chemist-photo" src={photoUrl} alt={`صورة الكيميائي ${trip.chemist_first_name}`} width={56} height={56} />}
                  {trip.chemist_first_name}
                </dd>
              </div>
            )}
            {date && (
              <div className="tv__info-row">
                <dt>ميعاد الزيارة</dt>
                <dd>{date}</dd>
              </div>
            )}
          </dl>
        )}

        {(!loading || netError) && <CallButton />}
      </section>
    </main>
  )
}
