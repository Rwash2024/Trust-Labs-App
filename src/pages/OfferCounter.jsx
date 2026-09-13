import LaunchOfferCounter from '../components/LaunchOfferCounter'
import logoWhiteFull from '../assets/logo-white-full.png'
import './OfferCounter.css'

// Full-screen display meant to run on a tablet or TV at branch reception —
// not part of the patient app's normal navigation. Open /offer-counter on the
// branch device and leave it up; it polls Supabase on its own.
export default function OfferCounter() {
  return (
    <div className="offer-counter">
      <img className="offer-counter__logo" src={logoWhiteFull} alt="Trust Labs" />
      <LaunchOfferCounter variant="kiosk" pollMs={10000} />
      <p className="offer-counter__hint">اسأل موظف الاستقبال عن التفاصيل</p>
    </div>
  )
}
