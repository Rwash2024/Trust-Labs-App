import { useState } from 'react'
import { fetchSampleStatusByPhone } from '../lib/data'
import { SearchIcon, ShieldIcon, CheckIcon } from '../components/icons'
import InternationalNav from '../components/InternationalNav'
import './TrackSample.css'

// Arabic status values are fixed in the database (sample_tracking check
// constraint) — translate the known set for display only.
const STATUS_STEPS_AR = [
  'تم تسجيل الطلب',
  'جاري السحب',
  'تم سحب العينة',
  'في المعمل - جاري التحليل',
  'جاهزة النتيجة',
  'تم التسليم',
]

const STATUS_LABELS_EN = [
  'Order registered',
  'Sample collection in progress',
  'Sample collected',
  'In lab — processing',
  'Result ready',
  'Delivered',
]

function ResultCard({ item }) {
  const stepIndex = STATUS_STEPS_AR.indexOf(item.status)
  return (
    <div className="track__result">
      <div className="track__result-row">
        <span>Patient name</span>
        <span>{item.patient_name}</span>
      </div>
      {item.booking_ref && (
        <div className="track__result-row">
          <span>Booking reference</span>
          <span dir="ltr">{item.booking_ref}</span>
        </div>
      )}
      <div className="track__result-row">
        <span>Last updated</span>
        <span>{new Date(item.updated_at).toLocaleString('en-GB')}</span>
      </div>

      <div className="track__steps">
        {STATUS_LABELS_EN.map((label, i) => (
          <div className={`track__step${i <= stepIndex ? ' done' : ''}`} key={label}>
            <span className="track__step-dot">{i <= stepIndex ? <CheckIcon width={14} height={14} /> : ''}</span>
            <span className="track__step-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function InternationalTrackSample() {
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('idle')
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
    <div className="track" dir="ltr" lang="en">
      <section className="track__hero">
        <span className="track__blob track__blob--1" />
        <span className="track__icon">
          <ShieldIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="track__title">Track your sample</h1>
        <p className="track__subtitle">Enter the phone number you booked with to check your sample status</p>

        <form className="track__search" onSubmit={handleSubmit}>
          <span className="track__search-icon">
            <SearchIcon />
          </span>
          <input
            className="track__search-input"
            type="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
          />
          <button className="track__search-btn" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? '...' : 'Search'}
          </button>
        </form>
      </section>

      <div className="track__body">
        {status === 'not-found' && (
          <p className="track__error">No booking found for this number. Double-check it or call our hotline on 16183.</p>
        )}

        {status === 'found' && (
          <div className="track__results">
            {results.map((item, i) => (
              <ResultCard item={item} key={item.booking_ref || i} />
            ))}
          </div>
        )}
      </div>

      <InternationalNav />
    </div>
  )
}
