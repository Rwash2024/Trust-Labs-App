import { useState } from 'react'
import { CardIcon, ShieldIcon, PercentIcon, GiftIcon, CheckIcon } from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
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

export default function TrustCard() {
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [form, setForm] = useState({ name: '', phone: '', needsCard: null })
  const [needsCardError, setNeedsCardError] = useState(false)

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const selectNeedsCard = (value) => {
    setForm((prev) => ({ ...prev, needsCard: value }))
    setNeedsCardError(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.needsCard) {
      setNeedsCardError(true)
      return
    }
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
          ...form,
          needsCard: form.needsCard === 'yes' ? 'محتاج الكارت فعلاً' : 'مش محتاجه حاليًا',
          requestType: 'طلب كارت الثقة',
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

        <span className="trust-card__discount-badge">خصم 25%</span>
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
          <p>هيتواصل معاك فريق خدمة العملاء لتفعيل كارت الثقة الخاص بيك.</p>
        </div>
      ) : showForm ? (
        <form className="trust-card__form" onSubmit={handleSubmit}>
          <h2 className="trust-card__form-title">تواصل معنا</h2>
          <p className="trust-card__form-subtitle">لطلب كارت الثقة من معامل Trust Labs</p>

          <label className="trust-card__field">
            <span>الاسم</span>
            <input required type="text" value={form.name} onChange={updateField('name')} placeholder="اسمك" />
          </label>

          <label className="trust-card__field">
            <span>رقم للتواصل</span>
            <input
              required
              type="tel"
              inputMode="numeric"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder="رقم للتواصل"
            />
          </label>

          <div className="trust-card__field">
            <span>محتاج الكارت فعلاً؟</span>
            <div className="trust-card__choice">
              <button
                type="button"
                className={`trust-card__choice-btn${form.needsCard === 'yes' ? ' active' : ''}`}
                onClick={() => selectNeedsCard('yes')}
              >
                أه محتاج الكارت فعلاً
              </button>
              <button
                type="button"
                className={`trust-card__choice-btn${form.needsCard === 'no' ? ' active' : ''}`}
                onClick={() => selectNeedsCard('no')}
              >
                لا مش محتاجه حاليًا
              </button>
            </div>
            {needsCardError && <p className="trust-card__error">من فضلك اختار إجابة قبل الإرسال.</p>}
          </div>

          {status === 'error' && (
            <p className="trust-card__error">
              {FORMSPREE_ENDPOINT
                ? 'حصل خطأ أثناء إرسال الطلب، حاول تاني أو اتصل بينا على 16183.'
                : 'الطلب أونلاين لسه مش متفعّل بالكامل — كلّم فريقنا على الهوتلاين 16183.'}
            </p>
          )}

          <button className="trust-card__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </form>
      ) : (
        <button className="trust-card__cta" onClick={() => setShowForm(true)}>
          أطلب كارت الثقة
        </button>
      )}
    </div>
  )
}
