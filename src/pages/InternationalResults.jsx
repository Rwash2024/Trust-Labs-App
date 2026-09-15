import { ArrowIcon, PhoneIcon } from '../components/icons'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import logoWhiteFull from '../assets/logo-white-full.png'
import InternationalNav from '../components/InternationalNav'
import './Results.css'

const RESULTS_URL = 'http://webresults.trustlabseg.com/Login/Index/?Type=Individual'

export default function InternationalResults() {
  const handleClick = () => {
    trackEvent(AnalyticsEvents.RESULTS_VIEWED)
  }

  return (
    <div className="results" dir="ltr" lang="en">
      <section className="results__hero">
        <span className="results__blob results__blob--1" />
        <img className="results__logo" src={logoWhiteFull} alt="Trust Labs" />
        <h1 className="results__title">Test Results</h1>
        <p className="results__subtitle">
          Log in to the online results portal and view your test results easily and securely
        </p>
      </section>

      <div className="results__body">
        <a className="results__cta" href={RESULTS_URL} target="_blank" rel="noreferrer" onClick={handleClick}>
          View my results
          <ArrowIcon />
        </a>

        <p className="results__hint">
          You'll need the sample number or login details you received at the time of your test.
        </p>

        <a className="results__help" href="tel:16183">
          <PhoneIcon />
          Need help? Call us on 16183
        </a>
      </div>

      <InternationalNav />
    </div>
  )
}
