import { Link } from 'react-router-dom'
import { FlaskIcon, MapPinIcon, PhoneIcon, WhatsAppIcon, CalendarIcon, BellIcon, SearchIcon, ArrowIcon, InfoIcon, ResultsIcon } from '../components/icons'
import logoWhiteFull from '../assets/logo-white-full.png'
import './Home.css'

const insuranceMessage = encodeURIComponent('السلام عليكم، عندي استفسار بخصوص موافقات التأمين.')
const whatsappUrl = `https://wa.me/201277610492?text=${insuranceMessage}`

const quickLinks = [
  { to: '/packages', label: 'الباقات والتحاليل', Icon: FlaskIcon },
  { to: '/booking', label: 'احجز موعدك', Icon: CalendarIcon },
  { to: '/contact', label: 'الخط الساخن والتواصل', Icon: PhoneIcon },
  { to: '/branches', label: 'فروعنا', Icon: MapPinIcon },
  { href: whatsappUrl, label: 'موافقات التأمين', Icon: WhatsAppIcon },
  { to: '/about', label: 'من نحن', Icon: InfoIcon },
]

export default function Home() {
  return (
    <div className="home">
      <section className="home__hero">
        <span className="home__blob home__blob--1" />
        <span className="home__blob home__blob--2" />

        <div className="home__topbar">
          <img className="home__logo" src={logoWhiteFull} alt="Trust Labs" />
          <button className="home__bell" aria-label="الإشعارات">
            <BellIcon />
          </button>
        </div>

        <h1 className="home__greeting">
          أهلاً بيك في Trust Labs
          <span>عايز تعمل إيه النهاردة؟</span>
        </h1>

        <Link className="home__search" to="/packages">
          <span className="home__search-icon">
            <SearchIcon />
          </span>
          <span className="home__search-text">ابحث عن تحليل أو باقة...</span>
        </Link>
      </section>

      <section className="home__section home__section--tight">
        <h2 className="home__section-title">إيه اللي محتاجه؟</h2>
        <div className="home__grid">
          {quickLinks.map(({ to, href, label, Icon }) =>
            href ? (
              <a className="home__card" key={label} href={href} target="_blank" rel="noreferrer">
                <span className="home__card-icon">
                  <Icon color="#fff" />
                </span>
                <span className="home__card-title">{label}</span>
              </a>
            ) : (
              <Link className="home__card" key={to} to={to}>
                <span className="home__card-icon">
                  <Icon color="#fff" />
                </span>
                <span className="home__card-title">{label}</span>
              </Link>
            )
          )}
        </div>
      </section>

      <section className="home__section">
        <Link className="home__banner home__banner--card" to="/results">
          <span className="home__banner-blob" />
          <span className="home__banner-icon home__banner-icon--light">
            <ResultsIcon width={44} height={44} />
          </span>
          <span className="home__banner-badge">أونلاين</span>
          <span className="home__banner-title">نتائج التحاليل</span>
          <span className="home__banner-desc">ادخل على بوابة النتائج وشوف نتيجة تحاليلك بكل سهولة وأمان</span>
          <span className="home__banner-cta">
            اعرض التفاصيل
            <ArrowIcon />
          </span>
        </Link>
      </section>

      <section className="home__section">
        <Link className="home__banner" to="/packages">
          <span className="home__banner-blob" />
          <span className="home__banner-icon">
            <FlaskIcon width={44} height={44} />
          </span>
          <span className="home__banner-badge">الأكثر طلبًا</span>
          <span className="home__banner-title">الباقة الذهبية</span>
          <span className="home__banner-desc">20 تحليل شامل بسعر خاص — أفضل تقييم صحي متكامل</span>
          <span className="home__banner-cta">
            اعرض التفاصيل
            <ArrowIcon />
          </span>
        </Link>
      </section>

      <section className="home__section">
        <Link className="home__banner home__banner--card" to="/trust-card">
          <span className="home__banner-blob" />
          <span className="home__banner-badge">خصم 25%</span>
          <span className="home__banner-title">كارت الثقة</span>
          <span className="home__banner-desc">احتفظ بكل بياناتك الطبية في مكان واحد ووفّر في كل تحاليلك</span>
          <span className="home__banner-cta">
            اعرض التفاصيل
            <ArrowIcon />
          </span>
        </Link>
      </section>
    </div>
  )
}
