import { Link } from 'react-router-dom'
import brand from '../brand'
import {
  PhoneIcon,
  WhatsAppIcon,
  MapPinIcon,
  ArrowIcon,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  ShieldIcon,
  ChatIcon,
  StarIcon,
} from '../components/icons'
import logoWhiteFull from '@client/logo-white-full.png'
import { parseHours } from '../lib/hours'
import './Contact.css'

const insuranceMessage = encodeURIComponent('السلام عليكم، ممكن استفسر عن حاجه؟')
const whatsappUrl = `https://wa.me/${brand.whatsapp}?text=${insuranceMessage}`

const socialLinks = [
  { label: 'فيسبوك', href: brand.social?.facebook, Icon: FacebookIcon },
  { label: 'انستجرام', href: brand.social?.instagram, Icon: InstagramIcon },
  { label: 'لينكدإن', href: brand.social?.linkedin, Icon: LinkedInIcon },
].filter((link) => link.href)

export default function Contact() {
  return (
    <div className="contact">
      <section className="contact__hero">
        <span className="contact__blob contact__blob--1" />

        <div className="contact__topbar">
          <img className="contact__logo" src={logoWhiteFull} alt={brand.name} />
        </div>

        <h1 className="contact__title">تواصل معنا</h1>
        <p className="contact__subtitle">فريقنا جاهز يساعدك في أي وقت</p>
      </section>

      <div className="contact__list">
        <a className="contact__card" href={`tel:${brand.hotline}`}>
          <span className="contact__card-icon">
            <PhoneIcon color="#fff" />
          </span>
          <span className="contact__card-info">
            <span className="contact__card-title">الخط الساخن</span>
            <span className="contact__card-value">{brand.hotline}</span>
          </span>
          <ArrowIcon className="contact__card-arrow" />
        </a>

        {brand.whatsapp && (
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
        )}

        {brand.features?.trackSample && (
          <Link className="contact__card" to="/track-sample">
            <span className="contact__card-icon">
              <ShieldIcon color="#fff" />
            </span>
            <span className="contact__card-info">
              <span className="contact__card-title">تتبع حالة عينتك</span>
              <span className="contact__card-value">اعرف عينتك وصلت فين برقم موبايلك</span>
            </span>
            <ArrowIcon className="contact__card-arrow" />
          </Link>
        )}

        {brand.features?.feedback && (
          <>
            <Link className="contact__card" to="/rate-visit">
              <span className="contact__card-icon">
                <StarIcon color="#fff" />
              </span>
              <span className="contact__card-info">
                <span className="contact__card-title">قيّم زيارتك</span>
                <span className="contact__card-value">30 ثانية بس تساعدنا نتحسن</span>
              </span>
              <ArrowIcon className="contact__card-arrow" />
            </Link>
    
            <Link className="contact__card" to="/complaints">
              <span className="contact__card-icon">
                <ChatIcon color="#fff" />
              </span>
              <span className="contact__card-info">
                <span className="contact__card-title">شكاوى واقتراحات</span>
                <span className="contact__card-value">رأيك بيهمنا، احكيلنا عن تجربتك</span>
              </span>
              <ArrowIcon className="contact__card-arrow" />
            </Link>
          </>
        )}
      </div>

      {brand.workingHours && (
        <section className="contact__hours">
          <h2 className="contact__hours-title">مواعيد العمل</h2>
          {parseHours(brand.workingHours).map(([label, value]) => (
            <div className="contact__hours-row" key={value}>
              {label && <span>{label}</span>}
              <span>{value}</span>
            </div>
          ))}
          {brand.workingHoursNote && <p className="contact__hours-note">{brand.workingHoursNote}</p>}
        </section>
      )}

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
