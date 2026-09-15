import { useState } from 'react'
import { CardIcon, ShieldIcon, PercentIcon, GiftIcon, CheckIcon } from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
import InternationalNav from '../components/InternationalNav'
import './TrustCard.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID
const FORMSPREE_ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : null

const benefits = [
  {
    Icon: CardIcon,
    title: 'All your health data in your pocket',
    desc: 'Every medical record in one card, so you can check in on your health anytime, easily.',
  },
  {
    Icon: ShieldIcon,
    title: 'Emergency profile privacy',
    desc: 'Your emergency profile holds the essentials — emergency contacts and blood type — while keeping your full medical history private.',
  },
  {
    Icon: CardIcon,
    title: 'A card that travels with you',
    desc: 'Your printed Trust Labs card gives instant access to your emergency profile by scanning a QR code.',
  },
  {
    Icon: PercentIcon,
    title: 'Discount rate',
    desc: 'Save on your medical costs with 25% off all tests for one year from the card activation date.',
  },
  {
    Icon: GiftIcon,
    title: 'Rewards program',
    desc: "With Trust Labs' rewards program, collect points and redeem them for free tests.",
  },
]

export default function InternationalTrustCard() {
  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState('idle')
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
          needsCard: form.needsCard === 'yes' ? 'Wants the card' : 'Not needed right now',
          requestType: 'Trust Card request (international)',
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="trust-card" dir="ltr" lang="en">
      <section className="trust-card__hero">
        <span className="trust-card__blob trust-card__blob--1" />

        <div className="trust-card__topbar">
          <img className="trust-card__logo" src={logoWhiteFull} alt="Trust Labs" />
        </div>

        <h1 className="trust-card__title">Trust Card</h1>
        <p className="trust-card__subtitle">
          Keep all your medical data in one place, easily and securely, and save on every test.
        </p>

        <span className="trust-card__discount-badge">25% off</span>
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
          <h2>Request sent</h2>
          <p>Our customer care team will contact you to activate your Trust Card.</p>
        </div>
      ) : showForm ? (
        <form className="trust-card__form" onSubmit={handleSubmit}>
          <h2 className="trust-card__form-title">Contact us</h2>
          <p className="trust-card__form-subtitle">To request a Trust Labs Trust Card</p>

          <label className="trust-card__field">
            <span>Name</span>
            <input required type="text" value={form.name} onChange={updateField('name')} placeholder="Your name" />
          </label>

          <label className="trust-card__field">
            <span>Phone number</span>
            <input required type="tel" value={form.phone} onChange={updateField('phone')} placeholder="Phone number" />
          </label>

          <div className="trust-card__field">
            <span>Do you want the card?</span>
            <div className="trust-card__choice">
              <button
                type="button"
                className={`trust-card__choice-btn${form.needsCard === 'yes' ? ' active' : ''}`}
                onClick={() => selectNeedsCard('yes')}
              >
                Yes, I want the card
              </button>
              <button
                type="button"
                className={`trust-card__choice-btn${form.needsCard === 'no' ? ' active' : ''}`}
                onClick={() => selectNeedsCard('no')}
              >
                Not right now
              </button>
            </div>
            {needsCardError && <p className="trust-card__error">Please choose an answer before submitting.</p>}
          </div>

          {status === 'error' && (
            <p className="trust-card__error">
              {FORMSPREE_ENDPOINT
                ? 'Something went wrong sending your request. Please try again or call us on 16183.'
                : 'Online requests are not fully active yet — please call our hotline on 16183.'}
            </p>
          )}

          <button className="trust-card__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending...' : 'Send'}
          </button>
        </form>
      ) : (
        <button className="trust-card__cta" onClick={() => setShowForm(true)}>
          Request Trust Card
        </button>
      )}

      <InternationalNav />
    </div>
  )
}
