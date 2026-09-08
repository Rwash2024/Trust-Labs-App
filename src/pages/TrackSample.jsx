import { useState } from 'react'
import { fetchSampleStatusByPhone } from '../lib/data'
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

export default function TrackSample() {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | found | not-found
  const [results, setResults] = useState([])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim()) return
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
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="01xxxxxxxxx"
          />
          <button className="track__search-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '...' : 'استعلام'}
          </button>
        </form>
      </section>

      <div className="track__body">
        {status === 'not-found' && (
          <p className="track__error">
            مفيش حجز مسجّل على الرقم ده، تأكد إنك كتبته صح أو كلّم الخط الساخن 16183.
          </p>
        )}

        {status === 'found' && (
          <div className="track__results">
            {results.map((item, i) => (
              <ResultCard item={item} key={item.booking_ref || i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
