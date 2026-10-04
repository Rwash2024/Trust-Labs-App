import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CardIcon, ShieldIcon, PercentIcon, GiftIcon, CheckIcon } from '../components/icons'
import brand from '../brand'
import logoWhiteFull from '@client/logo-white-full.png'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../lib/phone'
import { fetchTrustCardPrices, submitTrustCardRequest, DEFAULT_TRUST_CARD_PRICES } from '../lib/data'
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

// The card itself is blank (just a printed code + QR, no name) — the full
// four-part name (الاسم رباعي) here is just for staff to confirm identity
// when they call to arrange delivery.
// Note: "عبد الله" counts as two words — we can't tell compound names apart.
function fullNameError(value) {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'اكتب الاسم رباعي'
  if (words.some((w) => !/^[ء-يa-zA-Z]{2,}$/.test(w))) return 'الاسم لازم يكون حروف بس، وكل اسم حرفين على الأقل'
  if (words.length < 4) return `لازم الاسم يكون رباعي (كتبت ${words.length} ${words.length === 1 ? 'اسم' : 'أسماء'} بس)`
  return ''
}

const emptyForm = { cardType: null, forWhom: null, name: '', holderName: '', relationship: '', phone: '' }

export default function TrustCard() {
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [form, setForm] = useState(emptyForm)
  const [prices, setPrices] = useState(DEFAULT_TRUST_CARD_PRICES)
  const [touched, setTouched] = useState({})
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    fetchTrustCardPrices().then(setPrices)
  }, [])

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const updatePhone = (e) => setForm((prev) => ({ ...prev, phone: cleanEgyptPhoneInput(e.target.value) }))
  const touch = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))
  const selectForWhom = (value) => setForm((prev) => ({ ...prev, forWhom: value }))
  const selectCardType = (value) => setForm((prev) => ({ ...prev, cardType: value }))

  const isGift = form.forWhom === 'other'
  const isFamily = form.cardType === 'family'
  const errors = {
    cardType: form.cardType ? '' : 'اختار نوع الكارت',
    forWhom: form.forWhom ? '' : 'اختار الكارت ليك ولا لشخص تاني',
    // Buying for yourself: your name is the one on the card, so it must be four-part.
    name: isGift ? (form.name.trim() ? '' : 'اكتب اسمك') : fullNameError(form.name),
    holderName: isGift ? fullNameError(form.holderName) : '',
    relationship: isGift && !form.relationship ? 'اختار صلة القرابة' : '',
    phone: egyptPhoneError(form.phone),
  }
  const showError = (field) => (triedSubmit || touched[field]) && errors[field]
  const currentPrice = isFamily ? prices.family : prices.personal
  const priceLabel = `${currentPrice.toLocaleString('ar-EG')} جنيه`

  const handleSubmit = async (e) => {
    e.preventDefault()
    setTriedSubmit(true)
    if (Object.values(errors).some(Boolean)) return
    setStatus('submitting')
    const cardHolderName = isGift ? form.holderName.trim() : form.name.trim()

    // The database row is the order of record (admin tab "كارت الثقة"); the
    // Formspree email is only a heads-up. Either one landing means the order
    // isn't lost, so only fail when both do.
    const saved = await submitTrustCardRequest({
      forWhom: form.forWhom,
      buyerName: form.name,
      cardHolderName,
      relationship: form.relationship,
      phone: form.phone,
      cardType: form.cardType,
    })
      .then(() => true)
      .catch((err) => {
        console.error('saving trust card request failed', err)
        return false
      })

    const emailed = FORMSPREE_ENDPOINT
      ? await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            requestType: 'طلب كارت الثقة',
            cardType: isFamily ? 'عائلي' : 'شخصي',
            forWhom: isGift ? 'لشخص تاني (هدية)' : 'لنفسه',
            buyerName: form.name.trim(),
            cardHolderName,
            relationship: isGift ? form.relationship : '—',
            phone: form.phone,
            price: `${currentPrice} جنيه`,
          }),
        })
          .then((res) => res.ok)
          .catch(() => false)
      : false

    setStatus(saved || emailed ? 'success' : 'error')
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
          <span className="trust-card__discount-badge">شخصي {prices.personal.toLocaleString('ar-EG')} جنيه</span>
          <span className="trust-card__discount-badge">عائلي {prices.family.toLocaleString('ar-EG')} جنيه</span>
        </div>
      </section>

      <Link to="/medical-file" className="trust-card__cta trust-card__cta--file">
        <ShieldIcon width={20} height={20} />
        عندك كارت بالفعل؟ ادخل على ملفك الطبي
      </Link>

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
              : 'هيتواصل معاك فريق خدمة العملاء لتفعيل كارت الثقة الخاص بيك.'}{' '}
            وبعد ما تستلمه، ادخل تاني هنا واضغط "ادخل على ملفك الطبي" عشان تفعّله بموبايلك.
          </p>
        </div>
      ) : showForm ? (
        <form className="trust-card__form" onSubmit={handleSubmit} noValidate>
          <h2 className="trust-card__form-title">اطلب كارت الثقة</h2>

          <div className="trust-card__field">
            <span>نوع الكارت *</span>
            <div className="trust-card__choice">
              <button
                type="button"
                className={`trust-card__choice-btn${form.cardType === 'personal' ? ' active' : ''}`}
                onClick={() => selectCardType('personal')}
              >
                شخصي — {prices.personal.toLocaleString('ar-EG')} جنيه
              </button>
              <button
                type="button"
                className={`trust-card__choice-btn${form.cardType === 'family' ? ' active' : ''}`}
                onClick={() => selectCardType('family')}
              >
                عائلي (حتى 5 أفراد) — {prices.family.toLocaleString('ar-EG')} جنيه
              </button>
            </div>
            {triedSubmit && errors.cardType && <p className="trust-card__error">{errors.cardType}</p>}
          </div>

          {form.cardType && (
            <div className="trust-card__price-box">
              <span>سعر الكارت {isFamily ? 'العائلي' : 'الشخصي'}</span>
              <strong>{priceLabel}</strong>
              <small>
                {isFamily
                  ? 'يغطي صاحب الكارت + حتى 5 أفراد من العائلة، وخصم 25% على كل التحاليل لمدة سنة'
                  : 'وخصم 25% على كل التحاليل لمدة سنة'}
              </small>
            </div>
          )}

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
                <span>{isGift ? 'اسمك *' : 'اسمك رباعي *'}</span>
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
                    <span>اسم صاحب الكارت رباعي *</span>
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
              حصل خطأ أثناء إرسال الطلب، حاول تاني أو اتصل بينا على {brand.hotline}.
            </p>
          )}

          <button className="trust-card__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'جاري الإرسال...' : `اطلب الكارت — ${priceLabel}`}
          </button>
        </form>
      ) : (
        <button className="trust-card__cta trust-card__cta--outline" onClick={() => setShowForm(true)}>
          لسه معندكش كارت؟ اطلبه دلوقتي
        </button>
      )}
    </div>
  )
}
