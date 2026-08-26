import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { fetchBranchGroups, fetchAllTests } from '../lib/data'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import { FlaskIcon, MapPinIcon, CheckIcon, SearchIcon, PlusIcon } from '../components/icons'
import './Booking.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID
const FORMSPREE_ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : null
const HOME_VISIT_FEE = 75

function testToCartItem(test) {
  return { id: `test-${test.code}`, name: test.name, price: test.price, testCount: 1, tests: [test.name] }
}

export default function Booking() {
  const { selectedPackages, togglePackage, removePackage, clearCart } = useBooking()
  const [mode, setMode] = useState('home')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [form, setForm] = useState({ name: '', phone: '', address: '', branchName: '', date: '', notes: '' })
  const [testQuery, setTestQuery] = useState('')
  const [allBranches, setAllBranches] = useState([])
  const [allTests, setAllTests] = useState([])

  useEffect(() => {
    trackEvent(AnalyticsEvents.BOOKING_STARTED)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBranchGroups(), fetchAllTests()]).then(([groups, tests]) => {
      if (cancelled) return
      setAllBranches(groups.flatMap((g) => g.list.map((b) => ({ ...b, governorate: g.governorate }))))
      setAllTests(tests)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const addedIds = selectedPackages.map((p) => p.id)
  const subtotal = selectedPackages.reduce((sum, p) => sum + p.price, 0)
  const homeVisitFee = mode === 'home' ? HOME_VISIT_FEE : 0
  const total = subtotal + homeVisitFee

  const testSearchResults = useMemo(() => {
    const q = testQuery.trim().toLowerCase()
    if (!q) return []
    return allTests.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 30)
  }, [testQuery, allTests])

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!FORMSPREE_ENDPOINT) {
      setStatus('error')
      return
    }

    setStatus('submitting')
    const payload = {
      name: form.name,
      phone: form.phone,
      bookingType: mode === 'home' ? 'زيارة منزلية' : 'حجز فرع',
      address: mode === 'home' ? form.address : undefined,
      branch: mode === 'branch' ? form.branchName : undefined,
      date: form.date,
      notes: form.notes,
      packages: selectedPackages.map((p) => p.name).join(', '),
      subtotal,
      homeVisitFee,
      total,
    }

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('submit failed')
      setStatus('success')
      trackEvent(AnalyticsEvents.BOOKING_COMPLETED, { booking_type: payload.bookingType })
      clearCart()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="booking booking--done">
        <span className="booking__done-icon">
          <CheckIcon />
        </span>
        <h1>تم إرسال طلب الحجز</h1>
        <p>هيتواصل معاك فريق خدمة العملاء لتأكيد الموعد في أقرب وقت.</p>
        <Link className="booking__done-cta" to="/">
          الرجوع للرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="booking">
      <section className="booking__hero">
        <span className="booking__blob booking__blob--1" />
        <h1 className="booking__title">حجز موعد</h1>
        <p className="booking__subtitle">اختار نوع الحجز واملأ بياناتك، وهنتواصل معاك لتأكيد الموعد</p>
      </section>

      <div className="booking__body">
        <div className="booking__toggle">
          <button
            type="button"
            className={`booking__toggle-btn${mode === 'home' ? ' active' : ''}`}
            onClick={() => setMode('home')}
          >
            زيارة منزلية
          </button>
          <button
            type="button"
            className={`booking__toggle-btn${mode === 'branch' ? ' active' : ''}`}
            onClick={() => setMode('branch')}
          >
            حجز فرع
          </button>
        </div>

        <div className="booking__tests-picker">
          <h2 className="booking__section-title">التحاليل المطلوبة</h2>
          <p className="booking__tests-hint">
            حدّد التحاليل اللي محتاجها عشان الفني يجهّز الأنابيب والكيتات الصح لكل تحليل قبل ما ييجي.
          </p>
          <div className="booking__tests-search">
            <span className="booking__tests-search-icon">
              <SearchIcon />
            </span>
            <input
              className="booking__tests-search-input"
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="ابحث عن اسم التحليل..."
            />
          </div>

          {testQuery.trim() && (
            <div className="booking__tests-results">
              {testSearchResults.length === 0 ? (
                <p className="booking__tests-no-results">مفيش تحاليل مطابقة، جرّب اسم مختلف.</p>
              ) : (
                testSearchResults.map((test) => {
                  const isAdded = addedIds.includes(`test-${test.code}`)
                  return (
                    <button
                      type="button"
                      key={test.code}
                      className={`booking__test-row${isAdded ? ' added' : ''}`}
                      onClick={() => togglePackage(testToCartItem(test))}
                    >
                      <span className="booking__test-row-name">{test.name}</span>
                      <span className="booking__test-row-price">{test.price.toLocaleString('en-US')} جنيه</span>
                      <span className="booking__test-row-icon">{isAdded ? <CheckIcon /> : <PlusIcon />}</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {selectedPackages.length > 0 && (
          <div className="booking__cart">
            <h2 className="booking__section-title">التحاليل والباقات المختارة</h2>
            {selectedPackages.map((pkg) => (
              <div className="booking__cart-item" key={pkg.id}>
                <span className="booking__cart-icon">
                  <FlaskIcon color="#fff" />
                </span>
                <span className="booking__cart-info">
                  <span className="booking__cart-name">{pkg.name}</span>
                  <span className="booking__cart-price">{pkg.price.toLocaleString('en-US')} جنيه</span>
                </span>
                <button type="button" className="booking__cart-remove" onClick={() => removePackage(pkg.id)}>
                  إزالة
                </button>
              </div>
            ))}

            <div className="booking__total">
              <div className="booking__total-row">
                <span>إجمالي التحاليل والباقات</span>
                <span>{subtotal.toLocaleString('en-US')} جنيه</span>
              </div>
              {mode === 'home' && (
                <div className="booking__total-row">
                  <span>رسوم الزيارة المنزلية</span>
                  <span>{HOME_VISIT_FEE.toLocaleString('en-US')} جنيه</span>
                </div>
              )}
              <div className="booking__total-row booking__total-row--final">
                <span>الإجمالي</span>
                <span>{total.toLocaleString('en-US')} جنيه</span>
              </div>
            </div>
          </div>
        )}

        <form className="booking__form" onSubmit={handleSubmit}>
          <label className="booking__field">
            <span>الاسم بالكامل</span>
            <input required type="text" value={form.name} onChange={updateField('name')} placeholder="اكتب اسمك" />
          </label>

          <label className="booking__field">
            <span>رقم الموبايل</span>
            <input
              required
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder="01xxxxxxxxx"
            />
          </label>

          {mode === 'home' ? (
            <label className="booking__field">
              <span>العنوان بالتفصيل</span>
              <textarea
                required
                rows={3}
                value={form.address}
                onChange={updateField('address')}
                placeholder="المحافظة، الحي، الشارع، رقم العقار..."
              />
            </label>
          ) : (
            <label className="booking__field">
              <span>اختار الفرع</span>
              <select required value={form.branchName} onChange={updateField('branchName')}>
                <option value="" disabled>
                  اختار الفرع الأقرب ليك
                </option>
                {allBranches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.governorate} — {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="booking__field">
            <span>الميعاد المفضّل</span>
            <input required type="date" value={form.date} onChange={updateField('date')} />
          </label>

          <label className="booking__field">
            <span>ملاحظات (اختياري)</span>
            <textarea rows={2} value={form.notes} onChange={updateField('notes')} placeholder="أي تفاصيل إضافية" />
          </label>

          {status === 'error' && (
            <p className="booking__error">
              {FORMSPREE_ENDPOINT
                ? 'حصل خطأ أثناء إرسال الطلب، حاول تاني أو تواصل معنا على الهوتلاين 16183.'
                : 'الحجز أونلاين لسه مش متفعّل بالكامل — كلّم فريقنا على الهوتلاين 16183 أو واتساب الكول سنتر.'}
            </p>
          )}

          <button className="booking__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'جاري الإرسال...' : 'تأكيد الحجز'}
          </button>
        </form>

        <Link className="booking__branches-link" to="/branches">
          <MapPinIcon />
          استعرض كل الفروع
        </Link>
      </div>
    </div>
  )
}
