import { useEffect, useState } from 'react'
import { fetchLaunchOfferRemaining, LAUNCH_OFFER_TOTAL_SEATS } from '../lib/data'
import './LaunchOfferCounter.css'

// Shows how many of the first-100 launch-offer seats (free home-visit fee)
// are still available. Polls so a branch tablet running the /offer-counter
// kiosk page (or the Home banner) stays live without a manual refresh.
export default function LaunchOfferCounter({ variant = 'inline', pollMs = 20000 }) {
  const [remaining, setRemaining] = useState(undefined) // undefined = loading

  useEffect(() => {
    let cancelled = false
    const load = () => fetchLaunchOfferRemaining().then((n) => !cancelled && setRemaining(n))
    load()
    const id = setInterval(load, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs])

  if (remaining === undefined) return null // still loading, avoid a flash of "0"
  if (remaining === null) return null // feature not configured yet
  if (remaining <= 0) return null // offer fully claimed — quietly disappears

  const used = LAUNCH_OFFER_TOTAL_SEATS - remaining

  return (
    <div className={`launch-offer launch-offer--${variant}`}>
      <span className="launch-offer__count">{remaining}</span>
      <div className="launch-offer__text">
        <span className="launch-offer__title">مقعد فاضل من عرض الإطلاق</span>
        <span className="launch-offer__desc">أول {LAUNCH_OFFER_TOTAL_SEATS} حجز زيارة منزلية بدون رسوم الزيارة المنزلية بالكامل</span>
      </div>
      <div className="launch-offer__bar">
        <div className="launch-offer__bar-fill" style={{ width: `${(used / LAUNCH_OFFER_TOTAL_SEATS) * 100}%` }} />
      </div>
    </div>
  )
}
