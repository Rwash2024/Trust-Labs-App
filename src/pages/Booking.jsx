import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { fetchBranchGroups, fetchAllTests } from '../lib/data'
import { trackEvent, AnalyticsEvents } from '../lib/analytics'
import { FlaskIcon, MapPinIcon, CheckIcon, SearchIcon, PlusIcon } from '../components/icons'
import './Booking.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID
const FORMSPREE_ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : null
const PAYMOB_LINK = import.meta.env.VITE_PAYMOB_LINK
const HOME_VISIT_FEE = 75
const EGYPT_PHONE_REGEX = /^01[0125]\d{8}$/
const MAX_CARD_IMAGE_MB = 8

function testToCartItem(test) {
  return { id: `test-${test.code}`, name: test.name, price: test.price, testCount: 1, tests: [test.name] }
}

function generateBookingRef() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `TL-${dateStr}-${randomDigits}`
}

export default function Booking() {
  const { selectedPackages, togglePackage, removePackage, clearCart } = useBooking()
  const [mode, setMode] = useState('home')
  const [status, setStatus] = useState('idle') // idle | submitting | success | success-visa | error
  const [form, setForm] = useState({ name: '', phone: '', dob: '', address: '', branchName: '', date: '', notes: '' })
  const [testQuery, setTestQuery] = useState('')
  const [allBranches, setAllBranches] = useState([])
  const [allTests, setAllTests] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [hasCard, setHasCard] = useState(false)
  const [cardType, setCardType] = useState('insurance') // insurance | club
  const [cardImage, setCardImage] = useState(null)
  const [cardImageError, setCardImageError] = useState('')
  const [receipt, setReceipt] = useState(null)

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

  const updatePhone = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 11)
    setForm((prev) => ({ ...prev, phone: digitsOnly }))
  }

  const isPhoneValid = EGYPT_PHONE_REGEX.test(form.phone)

  const handleCardImageChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCardImageError('')
    if (!file.type.startsWith('image/')) {
      setCardImageError('لازم ترفع صورة (jpg أو png)')
      return
    }
    if (file.size > MAX_CARD_IMAGE_MB * 1024 * 1024) {
      setCardImageError(`الصورة كبيرة أوي — الحد الأقصى ${MAX_CARD_IMAGE_MB}MB`)
      return
    }
    setCardImage(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isPhoneValid) {
      setStatus('invalid-phone')
      return
    }
    if (!FORMSPREE_ENDPOINT) {
      setStatus('error')
      return
    }

    setStatus('submitting')
    const bookingType = mode === 'home' ? 'زيارة منزلية' : 'حجز فرع'
    const paymentLabel = paymentMethod === 'visa' ? 'فيزا (أونلاين)' : 'كاش'
    const branchLabel = mode === 'branch' ? form.branchName : 'زيارة منزلية'
    const patientType = hasCard ? (cardType === 'insurance' ? 'لديه كارنيه تأمين' : 'لديه كارنيه نادي') : 'Normal'
    const bookingRef = generateBookingRef()

    const data = new FormData()
    data.append('bookingRef', bookingRef)
    data.append('name', form.name)
    data.append('phone', form.phone)
    data.append('dob', form.dob)
    data.append('bookingType', bookingType)
    if (mode === 'home') data.append('address', form.address)
    if (mode === 'branch') data.append('branch', form.branchName)
    data.append('date', form.date)
    data.append('notes', form.notes)
    data.append('packages', selectedPackages.map((p) => p.name).join(', '))
    data.append('subtotal', subtotal)
    data.append('homeVisitFee', homeVisitFee)
    data.append('total', total)
    data.append('paymentMethod', paymentLabel)
    data.append('hasInsuranceOrClubCard', patientType)
    if (hasCard && cardImage) data.append('cardImage', cardImage)

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      })
      if (!res.ok) throw new Error('submit failed')
      trackEvent(AnalyticsEvents.BOOKING_COMPLETED, { booking_type: bookingType, payment_method: paymentMethod })

      setReceipt({
        bookingRef,
        branchLabel,
        name: form.name,
        dob: form.dob,
        phone: form.phone,
        address: mode === 'home' ? form.address : null,
        date: form.date,
        packages: selectedPackages.map((p) => p.name),
        patientType,
        subtotal,
        homeVisitFee,
        total,
        mode,
      })
      clearCart()

      if (paymentMethod === 'visa' && PAYMOB_LINK) {
        window.location.href = PAYMOB_LINK
        return
      }
      setStatus(paymentMethod === 'visa' ? 'success-visa' : 'success')
    } catch {
      setStatus('error')
    }
  }

  if ((status === 'success' || status === 'success-visa') && receipt) {
    return (
      <div className="booking booking--done">
        <span className="booking__done-icon">
          <CheckIcon />
        </span>
        <h1>تم إرسال طلب الحجز</h1>
        {status === 'success-visa' ? (
          <p>الدفع الإلكتروني هيتفعل قريبًا — هيتواصل معاك فريق خدمة العملاء لتأكيد الموعد وإتمام الدفع بالفيزا.</p>
        ) : (
          <p>هيتواصل معاك فريق خدمة العملاء لتأكيد الموعد في أقرب وقت.</p>
        )}

        <div className="booking__receipt">
          <div className="booking__receipt-header">
            <span className="booking__receipt-brand">Trust Labs</span>
            <span className="booking__receipt-branch">{receipt.branchLabel}</span>
          </div>

          <div className="booking__receipt-row">
            <span>اسم المريض</span>
            <span>{receipt.name}</span>
          </div>
          <div className="booking__receipt-row">
            <span>تاريخ الميلاد</span>
            <span>{receipt.dob || '—'}</span>
          </div>
          <div className="booking__receipt-row">
            <span>رقم التواصل</span>
            <span dir="ltr">{receipt.phone}</span>
          </div>
          {receipt.address && (
            <div className="booking__receipt-row">
              <span>العنوان</span>
              <span>{receipt.address}</span>
            </div>
          )}

          <div className="booking__receipt-divider" />

          <div className="booking__receipt-row booking__receipt-row--block">
            <span>التحاليل</span>
            <span>{receipt.packages.join('، ') || '—'}</span>
          </div>
          <div className="booking__receipt-row">
            <span>حالة المريض</span>
            <span>{receipt.patientType}</span>
          </div>
          <div className="booking__receipt-row">
            <span>يوم الزيارة</span>
            <span>{receipt.date}</span>
          </div>

          <div className="booking__receipt-divider" />

          <div className="booking__receipt-row">
            <span>التكلفة</span>
            <span>{receipt.subtotal.toLocaleString('en-US')} جنيه</span>
          </div>
          {receipt.mode === 'home' && (
            <div className="booking__receipt-row">
              <span>تكلفة الزيارة</span>
              <span>{receipt.homeVisitFee.toLocaleString('en-US')} جنيه</span>
            </div>
          )}
          <div className="booking__receipt-row booking__receipt-row--total">
            <span>الإجمالي</span>
            <span>{receipt.total.toLocaleString('en-US')} جنيه</span>
          </div>

          <div className="booking__receipt-ref">رقم الحجز: {receipt.bookingRef}</div>
        </div>

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

        <div className="booking__payment">
          <h2 className="booking__section-title">طريقة الدفع</h2>
          <div className="booking__toggle">
            <button
              type="button"
              className={`booking__toggle-btn${paymentMethod === 'cash' ? ' active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              كاش
            </button>
            <button
              type="button"
              className={`booking__toggle-btn${paymentMethod === 'visa' ? ' active' : ''}`}
              onClick={() => setPaymentMethod('visa')}
            >
              فيزا (أونلاين)
            </button>
          </div>
          <p className="booking__payment-hint">
            {paymentMethod === 'cash'
              ? mode === 'home'
                ? 'هتدفع كاش لـ كيميائي السحب لما ييجي المنزل'
                : 'هتدفع كاش لموظف الاستقبال في الفرع'
              : 'هتتحول لصفحة الدفع الإلكتروني الآمنة عشان تدخل بيانات الفيزا'}
          </p>

          <div className="booking__card-question">
            <span>عندك كارنيه تأمين أو كارنيه نادي؟</span>
            <div className="booking__toggle booking__toggle--sm">
              <button
                type="button"
                className={`booking__toggle-btn${!hasCard ? ' active' : ''}`}
                onClick={() => setHasCard(false)}
              >
                لا
              </button>
              <button
                type="button"
                className={`booking__toggle-btn${hasCard ? ' active' : ''}`}
                onClick={() => setHasCard(true)}
              >
                أيوه
              </button>
            </div>
          </div>

          {hasCard && (
            <div className="booking__card-details">
              <div className="booking__toggle booking__toggle--sm">
                <button
                  type="button"
                  className={`booking__toggle-btn${cardType === 'insurance' ? ' active' : ''}`}
                  onClick={() => setCardType('insurance')}
                >
                  كارنيه تأمين
                </button>
                <button
                  type="button"
                  className={`booking__toggle-btn${cardType === 'club' ? ' active' : ''}`}
                  onClick={() => setCardType('club')}
                >
                  كارنيه نادي
                </button>
              </div>

              <label className="booking__card-upload">
                <input type="file" accept="image/*" hidden onChange={handleCardImageChange} />
                <PlusIcon width={16} height={16} />
                {cardImage ? 'تغيير صورة الكارنيه' : 'رفع صورة الكارنيه'}
              </label>
              {cardImage && <span className="booking__card-filename">{cardImage.name}</span>}
              {cardImageError && <p className="booking__error">{cardImageError}</p>}

              <p className="booking__card-hint">
                هيشوف موظف خدمة العملاء بياناتك وصورة الكارنيه، وهيقولك السعر بعد خصم التأمين لما يتواصل معاك.
              </p>
            </div>
          )}
        </div>

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
              pattern="01[0125][0-9]{8}"
              value={form.phone}
              onChange={updatePhone}
              placeholder="01xxxxxxxxx"
              aria-invalid={form.phone.length > 0 && !isPhoneValid}
            />
            {form.phone.length > 0 && !isPhoneValid && (
              <span className="booking__field-error">لازم يكون رقم موبايل مصري صحيح (11 رقم، يبدأ بـ 010 أو 011 أو 012 أو 015)</span>
            )}
          </label>

          <label className="booking__field">
            <span>تاريخ الميلاد</span>
            <input required type="date" value={form.dob} onChange={updateField('dob')} />
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

          {status === 'invalid-phone' && (
            <p className="booking__error">من فضلك اكتب رقم موبايل مصري صحيح قبل تأكيد الحجز.</p>
          )}

          {status === 'error' && (
            <p className="booking__error">
              {FORMSPREE_ENDPOINT
                ? 'حصل خطأ أثناء إرسال الطلب، حاول تاني أو تواصل معنا على الهوتلاين 16183.'
                : 'الحجز أونلاين لسه مش متفعّل بالكامل — كلّم فريقنا على الهوتلاين 16183 أو واتساب الكول سنتر.'}
            </p>
          )}

          <button className="booking__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting'
              ? 'جاري الإرسال...'
              : paymentMethod === 'visa'
                ? 'تأكيد ودفع بالفيزا'
                : 'تأكيد الحجز'}
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
