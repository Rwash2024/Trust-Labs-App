import { useEffect, useState } from 'react'
import { ChatIcon, StarIcon, CheckIcon } from '../components/icons'
import { fetchBranchGroups, submitComplaint } from '../lib/data'
import './Complaints.css'

const TYPES = ['شكوى', 'اقتراح', 'استفسار']
const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/

const emptyForm = { name: '', phone: '', type: 'شكوى', branchName: '', rating: 0, message: '' }

export default function Complaints() {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBranchGroups().then((groups) => {
      setBranches(groups.flatMap((g) => g.list.map((b) => b.name)))
    })
  }, [])

  const isPhoneValid = EGYPT_PHONE_REGEX.test(form.phone)
  const canSubmit = form.name.trim() && isPhoneValid && form.message.trim() && status !== 'sending'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setStatus('sending')
    setError('')
    try {
      await submitComplaint(form)
      setForm(emptyForm)
      setStatus('sent')
    } catch (err) {
      setError(err.message || 'حصل خطأ، حاول تاني')
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="complaints">
        <section className="complaints__hero">
          <span className="complaints__blob complaints__blob--1" />
          <span className="complaints__icon">
            <ChatIcon width={28} height={28} color="#fff" />
          </span>
          <h1 className="complaints__title">شكاوى واقتراحات</h1>
        </section>
        <div className="complaints__body">
          <div className="complaints__success">
            <span className="complaints__success-icon">
              <CheckIcon width={28} height={28} />
            </span>
            <h2>تم استلام رسالتك</h2>
            <p>هيتواصل معاك فريقنا في أقرب وقت. شكرًا لثقتك في Trust Labs.</p>
            <button className="complaints__again-btn" onClick={() => setStatus('idle')}>
              إرسال رسالة تانية
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="complaints">
      <section className="complaints__hero">
        <span className="complaints__blob complaints__blob--1" />
        <span className="complaints__icon">
          <ChatIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="complaints__title">شكاوى واقتراحات</h1>
        <p className="complaints__subtitle">رأيك بيهمنا، احكيلنا عن تجربتك وإحنا هنسمعك</p>
      </section>

      <form className="complaints__body" onSubmit={handleSubmit}>
        <div className="complaints__card">
          <div className="complaints__types">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`complaints__type${form.type === t ? ' active' : ''}`}
                onClick={() => setForm({ ...form, type: t })}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="complaints__field">
            <span>الاسم</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="اسمك بالكامل"
            />
          </label>

          <label className="complaints__field">
            <span>رقم الموبايل</span>
            <input
              required
              dir="ltr"
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
              placeholder="01xxxxxxxxx"
              aria-invalid={form.phone.length > 0 && !isPhoneValid}
            />
            {form.phone.length > 0 && !isPhoneValid && (
              <span className="complaints__hint">لازم يكون رقم موبايل مصري صحيح (11 رقم)</span>
            )}
          </label>

          <label className="complaints__field">
            <span>الفرع (اختياري)</span>
            <select value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })}>
              <option value="">مش محدد</option>
              {branches.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="complaints__field">
            <span>قيّم تجربتك (اختياري)</span>
            <div className="complaints__rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`complaints__star${form.rating >= n ? ' active' : ''}`}
                  onClick={() => setForm({ ...form, rating: form.rating === n ? 0 : n })}
                  aria-label={`${n} نجوم`}
                >
                  <StarIcon width={26} height={26} />
                </button>
              ))}
            </div>
          </div>

          <label className="complaints__field">
            <span>تفاصيل {form.type === 'شكوى' ? 'الشكوى' : form.type === 'اقتراح' ? 'الاقتراح' : 'الاستفسار'}</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="اكتب تفاصيل رسالتك هنا..."
            />
          </label>

          {status === 'error' && <p className="complaints__error">{error}</p>}

          <button className="complaints__submit" type="submit" disabled={!canSubmit}>
            {status === 'sending' ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      </form>
    </div>
  )
}
