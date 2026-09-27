import { useEffect, useState } from 'react'
import { CardIcon, ShieldIcon, PercentIcon, GiftIcon, CheckIcon } from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../lib/phone'
import { fetchTrustCardPrice, DEFAULT_TRUST_CARD_PRICE } from '../lib/data'
import './TrustCard.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID
const FORMSPREE_ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : null

const benefits = [
  {
    Icon: CardIcon,
    title: 'كل بياناتك الصحية في جيبك',
    desc: 'جميع ملفاتك الطبية في كارت واحد، وفي أي وقت تقدر تطمن على نفسك بكل سهولة.',
  },
  {
    Icon: ShieldIcon,
    title: 'خصوصية ملف الطوارئ',
    desc: 'ملف الطوارئ فيه كل بياناتك الأساسية: جهات الاتصال وفصيلة الدم لمساعدتك في المواقف الصعبة، مع حماية تاريخك المرضي الكامل.',
  },
  {
    Icon: CardIcon,
    title: 'كارت يلحقك ويطمنك',
    desc: 'كارت Trust Labs المطبوع معاك على طول، لسهولة الوصول لملف الطوارئ الخاص بك عن طريق مسح الـ QR كود.',
  },
  {
    Icon: PercentIcon,
    title: 'نسبة الخصم',
    desc: 'وفّر مصاريفك الطبية واحصل على خصم 25% على جميع أنواع التحاليل لمدة سنة من بداية تفعيل الكارت.',
  },
  {
    Icon: GiftIcon,
    title: 'برنامج النقاط',
    desc: 'مع برنامج النقاط من Trust Labs هتقدر تستفيد بتحاليل مجانية مقابل تجميع النقاط.',
  },
]

const RELATIONSHIPS = ['أب', 'أم', 'زوج', 'زوجة', 'ابن', 'ابنة', 'أخ', 'أخت', 'قريب / صديق']

// The card is printed with the holder's name and tied to their medical file,
// so the holder's name must be the full four-part name (الاسم رباعي).
// Note: "عبد الله" counts as two words — we can't tell compound names apart.
function fullNameError(value) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'اكتب الاسم رباعي'
  if (words.some((w) => !/^[\u0621-\u064Aa-zA-Z]{2,}$/.test(w))) return 'الاسم لازم يكون حروف بس، وكل اسم حرفين على الأقل'
  if (words.length < 4) return `لازم الاسم يكون رباعي (كتبت ${words.length} ${words.length === 1 ? 'اسم' : 'أسماء'} بس)`
  return ''
}

const emptyForm = { forWhom: null, name: '', holderName: '', relationship: '', phone: '' }

export default function TrustCard() {
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [form, setForm] = useState(emptyForm)
  const [price, setPrice] = useState(DEFAULT_TRUST_CARD_PRICE)
  const [touched, setTouched] = useState({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    fetchTrustCardPrice().then(setPrice)
  }, [])

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const updatePhone = (e) => setForm((prev) => ({ ...prev, phone: cleanEgyptPhoneInput(e.target.value) }))
  const touch = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))
  const selectForWhom = (value) => setForm((prev) => ({ ...prev, forWhom: value }))

  const isGift = form.forWhom === 'other'
  const errors = {
    forWhom: form.forWhom ? '' : 'اختار الكارت ليك ولا لشخص تاني',
    // Buying for yourself: your name is the one on the card, so it must be four-part.
    name: isGift ? (form.name.trim() ? '' : 'اكتب اسمك') : fullNameError(form.name),
    holderName: isGift ? fullNameError(form.holderName) : '',
    relationship: isGift && !form.relationship ? 'اختار صلة القرابة' : '',
    phone: egyptPhoneError(form.phone),
  }
  const showError = (field) => (triedSubmit || touched[field]) && errors[field]
  const priceLabel = `${price.toLocaleString('ar-EG')} جنيه`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTriedSubmit(true)
    if (Object.values(errors).some(Boolean)) return
    if (!FORMSPREE_ENDPOINT) {
      setStatus('error')
      return
    }

    setStatus('submitting')
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          requestType: 'طلب كارت الثقة',
          forWhom: isGift ? 'لشخص تاني (هدية)' : 'لنفسه',
          buyerName: form.name.trim(),
          cardHolderName: isGift ? form.holderName.trim() : form.name.trim(),
          relationship: isGift ? form.relationship : '—',
          phone: form.phone,
          price: `${price} جنيه`,
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="trust-card">
      <section className="trust-card__hero">
        <span className="trust-card__blob trust-card__blob--1" />

        <div className="trust-card__topbar">
          <img className="trust-card__logo" src={logoWhiteFull} alt="Trust Labs" />
        </div>

        <h1 className="trust-card__title">كارت الثقة</h1>
        <p className="trust-card__subtitle">
          الكارت بيساعدك تحتفظ بكل بياناتك الطبية في مكان واحد بكل سهولة وأمان، وبيوفرلك خصومات على كل تحاليلك.
        </p>

        <div className="trust-card__badges">
          <span className="trust-card__discount-badge">خصم 25%</span>
          <span className="trust-card__discount-badge">السعر {priceLabel}</span>
        </div>
      </section>

      <div className="trust-card__benefits">
        {benefits.map(({ Icon, title, desc }) => (
          <div className="trust-card__benefit" key={title}>
            <span className="trust-card__benefit-icon">
              <Icon color="#fff" />
            </span>
            <span className="trust-card__benefit-body">
              <span className="trust-card__benefit-title">{title}</span>
              <span className="trust-card__benefit-desc">{desc}</span>
            </span>
          </div>
        ))}
      </div>

      {status === 'success' ? (
        <div className="trust-card__success">
          <span className="trust-card__success-icon">
            <CheckIcon />
          </span>
          <h2>تم إرسال طلبك</h2>
          <p>
            {isGift
              ? `هيتواصل معاك فريق خدمة العملاء لتفعيل كارت الثقة لـ ${form.holderName.trim()}.`
              : 'هيتواصل معاك فريق خدمة العملاء لتفعيل كارت الثقة الخاص بيك.'}
          </p>
        </div>
      ) : showForm ? (
        <form className="trust-card__form" onSubmit={handleSubmit} noValidate>
          <h2 className="trust-card__form-title">اطلب كارت الثقة</h2>
          <div className="trust-card__price-box">
            <span>سعر الكارت</span>
            <strong>{priceLabel}</strong>
            <small>وخصم 25% على كل التحاليل لمدة سنة</small>
          </div>

          <div className="trust-card__field">
            <span>الكارت ده لمين؟ *</span>
            <div className="trust-card__choice">
              <button
                type="button"
                className={`trust-card__choice-btn${form.forWhom === 'self' ? ' active' : ''}`}
                onClick={() => selectForWhom('self')}
              >
                أيوه، عايز الكارت لنفسي
              </button>
              <button
                type="button"
                className={`trust-card__choice-btn${form.forWhom === 'other' ? ' active' : ''}`}
                onClick={() => selectForWhom('other')}
              >
                عايز الكارت لشخص تاني 🎁
              </button>
            </div>
            {triedSubmit && errors.forWhom && <p className="trust-card__error">{errors.forWhom}</p>}
          </div>

          {form.forWhom && (
            <>
              <label className="trust-card__field">
                <span>{isGift ? 'اسمك *' : 'اسمك رباعي * (هيتكتب على الكارت)'}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={updateField('name')}
                  onBlur={touch('name')}
                  placeholder={isGift ? 'اسمك' : 'مثلاً: محمد أحمد محمود علي'}
                  aria-invalid={!!showError('name')}
                />
                {showError('name') && <span className="trust-card__error">{errors.name}</span>}
              </label>

              {isGift && (
                <>
                  <label className="trust-card__field">
                    <span>اسم صاحب الكارت رباعي * (هيتكتب على الكارت)</span>
                    <input
                      type="text"
                      value={form.holderName}
                      onChange={updateField('holderName')}
                      onBlur={touch('holderName')}
                      placeholder="مثلاً: فاطمة حسن محمود علي"
                      aria-invalid={!!showError('holderName')}
                    />
                    {showError('holderName') && <span className="trust-card__error">{errors.holderName}</span>}
                  </label>

                  <label className="trust-card__field">
                    <span>صلة القرابة *</span>
                    <select value={form.relationship} onChange={updateField('relationship')} aria-invalid={!!showError('relationship')}>
                      <option value="" disabled>
                        صاحب الكارت يقربلك إيه؟
                      </option>
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {showError('relationship') && <span className="trust-card__error">{errors.relationship}</span>}
                  </label>
                </>
              )}

              <label className="trust-card__field">
                <span>رقم للتواصل *</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  value={form.phone}
                  onChange={updatePhone}
                  onBlur={touch('phone')}
                  placeholder="01xxxxxxxxx"
                  aria-invalid={!!showError('phone')}
                />
                {showError('phone') && <span className="trust-card__error">{errors.phone}</span>}
              </label>
            </>
          )}

          {status === 'error' && (
            <p className="trust-card__error">
              {FORMSPREE_ENDPOINT
                ? 'حصل خطأ أثناء إرسال الطلب، حاول تاني أو اتصل بينا على 16183.'
                : 'الطلب أونلاين لسه مش متفعّل بالكامل — كلّم فريقنا على الخط الساخن 16183.'}
            </p>
          )}

          <button className="trust-card__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'جاري الإرسال...' : `اطلب الكارت — ${priceLabel}`}
          </button>
        </form>
      ) : (
        <button className="trust-card__cta" onClick={() => setShowForm(true)}>
          أطلب كارت الثقة — {priceLabel}
        </button>
      )}
    </div>
  )
}
