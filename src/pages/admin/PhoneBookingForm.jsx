import { useEffect, useState } from 'react'
import { staffCreateHomeBooking } from '../../lib/chemistApi'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../../lib/phone'

// Stored as Arabic text like the booking form does ('كاش'). Not 'فيزا (أونلاين)':
// any 'فيزا%' value makes the DB trigger mark the booking as awaiting online payment.
const PAYMENT_OPTIONS = [
  { value: 'كاش', label: 'كاش' },
  { value: 'بطاقة عند الزيارة', label: 'بطاقة عند الزيارة' },
]

const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())

const emptyForm = () => ({
  name: '',
  phone: '',
  address: '',
  locationLink: '',
  date: cairoToday(),
  tests: '',
  paymentMethod: 'كاش',
  notes: '',
})

function validate(f) {
  const errors = {}
  if (!f.name.trim()) errors.name = 'اكتب اسم العميل'
  const phoneError = egyptPhoneError(f.phone)
  if (phoneError) errors.phone = phoneError
  if (!f.address.trim()) errors.address = 'اكتب العنوان'
  if (f.locationLink.trim() && !/^https?:\/\//i.test(f.locationLink.trim())) {
    errors.locationLink = 'اللينك لازم يبدأ بـ https://'
  }
  if (!f.date) errors.date = 'اختار التاريخ'
  return errors
}

export default function PhoneBookingForm({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(null)

  useEffect(() => {
    if (open) document.getElementById('pb-name')?.focus()
  }, [open])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const close = () => {
    setOpen(false)
    setForm(emptyForm())
    setErrors({})
    setSubmitError('')
    setCreated(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setSubmitError('')
    const firstBad = Object.keys(found)[0]
    if (firstBad) {
      document.getElementById(`pb-${firstBad}`)?.focus()
      return
    }
    setBusy(true)
    try {
      const row = await staffCreateHomeBooking({
        name: form.name.trim(),
        phone: form.phone,
        address: form.address.trim(),
        locationLink: form.locationLink.trim() || null,
        date: form.date,
        tests: form.tests.trim(),
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim() || null,
      })
      setCreated(row?.booking_ref || '')
      setForm(emptyForm())
      await onCreated?.()
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="admin-btn admin-btn--primary phone-booking__open" onClick={() => setOpen(true)}>
        + زيارة منزلية بالتليفون
      </button>
    )
  }

  const field = (key, label, input, hint) => (
    <div className="phone-booking__field">
      <label htmlFor={`pb-${key}`}>{label}</label>
      {input}
      {hint && <span className="admin-form__hint">{hint}</span>}
      {errors[key] && (
        <span id={`pb-${key}-err`} className="phone-booking__error" role="alert">
          {errors[key]}
        </span>
      )}
    </div>
  )
  const aria = (key) => ({
    id: `pb-${key}`,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `pb-${key}-err` : undefined,
  })

  return (
    <form className="admin-form phone-booking" onSubmit={handleSubmit}
      onKeyDown={(e) => e.key === 'Escape' && !busy && close()}
      noValidate
    >
      <h3>زيارة منزلية بالتليفون</h3>

      {created !== null && (
        <p className="phone-booking__success" role="status">
          اتسجل الحجز. رقم الحجز: <strong dir="ltr">{created}</strong>
        </p>
      )}
      {submitError && (
        <p className="admin-error" role="alert">
          {submitError}
        </p>
      )}

      <div className="admin-form__row">
        {field('name', 'الاسم', <input {...aria('name')} value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="off" />)}
        {field(
          'phone',
          'التليفون',
          <input
            {...aria('phone')}
            type="tel"
            inputMode="numeric"
            dir="ltr"
            value={form.phone}
            onChange={(e) => set('phone', cleanEgyptPhoneInput(e.target.value))}
            autoComplete="off"
          />,
        )}
      </div>
      {field('address', 'العنوان', <textarea {...aria('address')} rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />)}
      {field(
        'locationLink',
        'لينك الخريطة (اختياري)',
        <input {...aria('locationLink')} type="url" dir="ltr" value={form.locationLink} onChange={(e) => set('locationLink', e.target.value)} />,
      )}
      <div className="admin-form__row">
        {field('date', 'التاريخ', <input {...aria('date')} type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />)}
        {field(
          'paymentMethod',
          'طريقة الدفع',
          <select {...aria('paymentMethod')} value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>,
        )}
      </div>
      {field(
        'tests',
        'التحاليل (اختياري)',
        <textarea {...aria('tests')} rows={2} value={form.tests} onChange={(e) => set('tests', e.target.value)} />,
        'اكتب كل تحليل في سطر أو افصل بينهم بفاصلة',
      )}
      {field('notes', 'ملاحظات', <textarea {...aria('notes')} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />)}

      <div className="admin-form__actions">
        <button type="submit" className="admin-btn admin-btn--primary phone-booking__btn" disabled={busy}>
          {busy ? 'جاري الحفظ...' : 'سجّل الحجز'}
        </button>
        <button type="button" className="admin-btn phone-booking__btn" onClick={close} disabled={busy}>
          {created !== null ? 'تمام' : 'إلغاء'}
        </button>
      </div>
    </form>
  )
}
