import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import brand from '../brand'
import { fetchSampleStatusByPhone } from '../lib/data'
import { findTrip } from '../lib/chemistApi'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../lib/phone'
import { SearchIcon, ShieldIcon, CheckIcon } from '../components/icons'
import './TrackSample.css'

const STATUS_STEPS = [
  'تم تسجيل الطلب',
  'جاري السحب',
  'تم سحب العينة',
  'في المعمل - جاري التحليل',
  'جاهزة النتيجة',
  'تم التسليم',
]

function ResultCard({ item }) {
  const stepIndex = STATUS_STEPS.indexOf(item.status)
  return (
    <div className="track__result">
      <div className="track__result-row">
        <span>اسم المريض</span>
        <span>{item.patient_name}</span>
      </div>
      {item.booking_ref && (
        <div className="track__result-row">
          <span>رقم الحجز</span>
          <span dir="ltr">{item.booking_ref}</span>
        </div>
      )}
      <div className="track__result-row">
        <span>آخر تحديث</span>
        <span>{new Date(item.updated_at).toLocaleString('ar-EG')}</span>
      </div>

      <div className="track__steps">
        {STATUS_STEPS.map((step, i) => (
          <div className={`track__step${i <= stepIndex ? ' done' : ''}`} key={step}>
            <span className="track__step-dot">{i <= stepIndex ? <CheckIcon width={14} height={14} /> : ''}</span>
            <span className="track__step-label">{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VisitLookup() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [ref, setRef] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '' }) // idle | loading | error | none

  const handleSubmit = async (e) => {
    e.preventDefault()
    const phoneError = egyptPhoneError(phone)
    if (phoneError) return setState({ status: 'error', message: phoneError })
    if (!ref.trim()) return setState({ status: 'error', message: 'اكتب رقم الحجز' })
    setState({ status: 'loading', message: '' })
    try {
      const token = await findTrip(phone.trim(), ref.trim())
      if (token) navigate(`/t/${token}`)
      else setState({ status: 'none', message: '' })
    } catch (err) {
      setState({ status: 'error', message: err.message })
    }
  }

  return (
    <section className="track__visit">
      <h2 className="track__visit-title">تتبع الزيارة المنزلية</h2>
      <p className="track__visit-sub">لو حجزت زيارة منزلية، اكتب رقم موبايلك ورقم الحجز عشان تتابع الكيميائي.</p>
      <form className="track__visit-form" onSubmit={handleSubmit}>
        <label className="track__visit-label" htmlFor="visit-phone">رقم الموبايل</label>
        <input
          id="visit-phone"
          className="track__visit-input"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(cleanEgyptPhoneInput(e.target.value))}
          placeholder="01xxxxxxxxx"
        />
        <label className="track__visit-label" htmlFor="visit-ref">رقم الحجز</label>
        <input
          id="visit-ref"
          className="track__visit-input"
          type="text"
          dir="ltr"
          autoComplete="off"
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <button className="track__visit-btn" type="submit" disabled={state.status === 'loading'}>
          {state.status === 'loading' ? '...' : 'تتبع الزيارة'}
        </button>
      </form>
      <div role="status">
        {state.status === 'error' && <p className="track__error">{state.message}</p>}
        {state.status === 'none' && (
          <p className="track__error track__error--info">
            لسه ما اتحددش كيميائي لزيارتك، هيوصلك لينك على واتساب أول ما يتحدد
          </p>
        )}
      </div>
    </section>
  )
}

export default function TrackSample() {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | found | not-found
  const [results, setResults] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return
    if (egyptPhoneError(phone)) {
      setStatus('invalid-phone')
      return
    }
    setStatus('loading')
    const data = await fetchSampleStatusByPhone(phone.trim())
    if (data.length > 0) {
      setResults(data)
      setStatus('found')
    } else {
      setResults([])
      setStatus('not-found')
    }
  }

  return (
    <div className="track">
      <section className="track__hero">
        <span className="track__blob track__blob--1" />
        <span className="track__icon">
          <ShieldIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="track__title">تابع حالة عينتك</h1>
        <p className="track__subtitle">اكتب رقم الموبايل اللي حجزت بيه عشان تعرف عينتك وصلت فين</p>

        <form className="track__search" onSubmit={handleSubmit}>
          <span className="track__search-icon">
            <SearchIcon />
          </span>
          <input
            className="track__search-input"
            type="tel"
            dir="ltr"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(cleanEgyptPhoneInput(e.target.value))}
            placeholder="01xxxxxxxxx"
          />
          <button className="track__search-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '...' : 'استعلام'}
          </button>
        </form>
      </section>

      <div className="track__body">
        {status === 'invalid-phone' && <p className="track__error">{egyptPhoneError(phone)}</p>}
        {status === 'not-found' && (
          <p className="track__error">
            مفيش حجز مسجّل على الرقم ده، تأكد إنك كتبته صح أو كلّم الخط الساخن {brand.hotline}.
          </p>
        )}

        {status === 'found' && (
          <div className="track__results">
            {results.map((item, i) => (
              <ResultCard item={item} key={item.booking_ref || i} />
            ))}
          </div>
        )}

        <VisitLookup />
      </div>
    </div>
  )
}
