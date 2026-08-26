import { Link } from 'react-router-dom'
import { PhoneIcon, WhatsAppIcon, MapPinIcon, ArrowIcon, FacebookIcon, InstagramIcon, LinkedInIcon } from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
import './Contact.css'

const insuranceMessage = encodeURIComponent('السلام عليكم، عندي استفسار.')
const whatsappUrl = `https://wa.me/201277610492?text=${insuranceMessage}`

const socialLinks = [
  { label: 'فيسبوك', href: 'https://www.facebook.com/TrustLabsEgypt', Icon: FacebookIcon },
  { label: 'انستجرام', href: 'https://www.instagram.com/trust.labs/', Icon: InstagramIcon },
  { label: 'لينكدإن', href: 'https://www.linkedin.com/company/trust-labs-egypt', Icon: LinkedInIcon },
]

export default function Contact() {
  return (
    <div className="contact">
      <section className="contact__hero">
        <span className="contact__blob contact__blob--1" />

        <div className="contact__topbar">
          <img className="contact__logo" src={logoWhiteFull} alt="Trust Labs" />
        </div>

        <h1 className="contact__title">تواصل معنا</h1>
        <p className="contact__subtitle">فريقنا جاهز يساعدك في أي وقت</p>
      </section>

      <div className="contact__list">
        <a className="contact__card" href="tel:16183">
          <span className="contact__card-icon">
            <PhoneIcon color="#fff" />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">الخط الساخن</span>
            <span className="contact__card-value">16183</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </a>

        <a className="contact__card" href={whatsappUrl} target="_blank" rel="noreferrer">
          <span className="contact__card-icon contact__card-icon--whatsapp">
            <WhatsAppIcon />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">واتساب خدمة العملاء</span>
            <span className="contact__card-value">تواصل مباشر مع الكول سنتر</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </a>
      </div>

      <section className="contact__hours">
        <h2 className="contact__hours-title">مواعيد العمل</h2>
        <div className="contact__hours-row">
          <span>السبت – الخميس</span>
          <span>8 صباحًا – 11 مساءً</span>
        </div>
        <div className="contact__hours-row">
          <span>الجمعة</span>
          <span>إجازة</span>
        </div>
        <p className="contact__hours-note">فرع المهندسين يعمل من 10 صباحًا حتى 10 مساءً</p>
      </section>

      <Link className="contact__branches-link" to="/branches">
        <MapPinIcon />
        قرّبنا منك؟ استعرض كل الفروع
      </Link>

      <section className="contact__social">
        <h2 className="contact__social-title">تابعنا على السوشيال ميديا</h2>
        <div className="contact__social-list">
          {socialLinks.map(({ label, href, Icon }) => (
            <a key={label} className="contact__social-link" href={href} target="_blank" rel="noreferrer" aria-label={label}>
              <Icon />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
