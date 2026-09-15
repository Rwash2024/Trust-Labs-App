import { Link } from 'react-router-dom'
import {
  PhoneIcon,
  WhatsAppIcon,
  MapPinIcon,
  ArrowIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  ShieldIcon,
} from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
import InternationalNav from '../components/InternationalNav'
import './Contact.css'

const insuranceMessage = encodeURIComponent('Hello, I have a question about Trust Labs.')
const whatsappUrl = `https://wa.me/201277610492?text=${insuranceMessage}`

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/TrustLabsEgypt', Icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/trust.labs/', Icon: InstagramIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/trust-labs-egypt', Icon: LinkedInIcon },
]

export default function InternationalContact() {
  return (
    <div className="contact" dir="ltr" lang="en">
      <section className="contact__hero">
        <span className="contact__blob contact__blob--1" />

        <div className="contact__topbar">
          <img className="contact__logo" src={logoWhiteFull} alt="Trust Labs" />
        </div>

        <h1 className="contact__title">Contact Us</h1>
        <p className="contact__subtitle">Our team is ready to help you anytime</p>
      </section>

      <div className="contact__list">
        <a className="contact__card" href="tel:16183">
          <span className="contact__card-icon">
            <PhoneIcon color="#fff" />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">Hotline</span>
            <span className="contact__card-value">16183</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </a>

        <a className="contact__card" href={whatsappUrl} target="_blank" rel="noreferrer">
          <span className="contact__card-icon contact__card-icon--whatsapp">
            <WhatsAppIcon />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">Customer care WhatsApp</span>
            <span className="contact__card-value">Chat directly with our call center</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </a>

        <Link className="contact__card" to="/international/track-sample">
          <span className="contact__card-icon">
            <ShieldIcon color="#fff" />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">Track your sample</span>
            <span className="contact__card-value">Check your sample status with your phone number</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </Link>
      </div>

      <section className="contact__hours">
        <h2 className="contact__hours-title">Working hours</h2>
        <div className="contact__hours-row">
          <span>Saturday – Thursday</span>
          <span>8 AM – 11 PM</span>
        </div>
        <div className="contact__hours-row">
          <span>Friday</span>
          <span>Closed</span>
        </div>
        <p className="contact__hours-note">Some branches have different Friday hours — check the branch card for details.</p>
      </section>

      <Link className="contact__branches-link" to="/international/branches">
        <MapPinIcon />
        Find the nearest branch
      </Link>

      <section className="contact__social">
        <h2 className="contact__social-title">Follow us on social media</h2>
        <div className="contact__social-list">
          {socialLinks.map(({ label, href, Icon }) => (
            <a key={label} className="contact__social-link" href={href} target="_blank" rel="noreferrer" aria-label={label}>
              <Icon />
            </a>
          ))}
        </div>
      </section>

      <InternationalNav />
    </div>
  )
}
