import { ArrowIcon, PhoneIcon } from '../components/icons'
import brand from '../brand'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import logoWhiteFull from '@client/logo-white-full.png'
import './Results.css'

const RESULTS_URL = brand.resultsUrl

export default function Results() {
  const handleClick = () => {
    trackEvent(AnalyticsEvents.RESULTS_VIEWED)
  }

  return (
    <div className="results">
      <section className="results__hero">
        <span className="results__blob results__blob--1" />
        <img className="results__logo" src={logoWhiteFull} alt={brand.name} />
        <h1 className="results__title">نتائج التحاليل</h1>
        <p className="results__subtitle">
          ادخل على بوابة النتائج الإلكترونية وشوف نتيجة تحاليلك أونلاين بكل سهولة وأمان
        </p>
      </section>

      <div className="results__body">
        <a
          className="results__cta"
          href={RESULTS_URL}
          target="_blank"
          rel="noreferrer"
          onClick={handleClick}
        >
          الدخول لعرض النتائج
          <ArrowIcon />
        </a>

        <p className="results__hint">
          هتحتاج رقم العينة أو بيانات الدخول اللي استلمتها وقت الفحص عشان تدخل على النتيجة.
        </p>

        <a className="results__help" href={`tel:${brand.hotline}`}>
          <PhoneIcon />
          محتاج مساعدة؟ اتصل بنا على {brand.hotline}
        </a>
      </div>
    </div>
  )
}
