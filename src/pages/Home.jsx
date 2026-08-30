import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FlaskIcon, MapPinIcon, PhoneIcon, WhatsAppIcon, CalendarIcon, BellIcon, SearchIcon, ArrowIcon, InfoIcon, ResultsIcon, CheckIcon, PlusIcon, ShieldIcon } from '../components/icons'
import BannerCarousel from '../components/BannerCarousel'
import BannerCard from '../components/BannerCard'
import { fetchFeaturedTests } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { useBooking } from '../context/BookingContext'
import logoWhiteFull from '../assets/logo-white-full.png'
import '../styles/modal.css'
import './Home.css'

const insuranceMessage = encodeURIComponent('السلام عليكم، عندي استفسار بخصوص موافقات التأمين.')
const whatsappUrl = `https://wa.me/201277610492?text=${insuranceMessage}`

function FeaturedTestModal({ test, isAdded, onAdd, onClose }) {
  return (
    <div className="pkg-modal__overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        {test.image ? (
          <img className="pkg-modal__img" src={test.image} alt="" />
        ) : (
          <div className="banner-card__icon banner-card__icon--modal">
            <FlaskIcon color="#fff" width={36} height={36} />
          </div>
        )}
        <div className="pkg-modal__body">
          <h3 className="pkg-modal__name">{test.name}</h3>
          <p className="pkg-modal__highlight">{test.highlight}</p>
          <span className="pkg-modal__price">{test.price.toLocaleString('en-US')} جنيه</span>
          <button className={`pkg-modal__cta${isAdded ? ' added' : ''}`} onClick={onAdd}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
            {isAdded ? 'تمت الإضافة للحجز' : 'أضف للحجز'}
          </button>
        </div>
      </div>
    </div>
  )
}

const quickLinks = [
  { to: '/packages', label: 'الباقات والتحاليل', Icon: FlaskIcon },
  { to: '/booking', label: 'احجز موعدك', Icon: CalendarIcon },
  { to: '/contact', label: 'الخط الساخن والتواصل', Icon: PhoneIcon },
  { to: '/branches', label: 'فروعنا', Icon: MapPinIcon },
  { href: whatsappUrl, label: 'موافقات التأمين', Icon: WhatsAppIcon },
  { to: '/about', label: 'من نحن', Icon: InfoIcon },
  { to: '/prep-instructions', label: 'شروط تحضير التحاليل', Icon: ShieldIcon },
]

export default function Home() {
  const [featuredTests, setFeaturedTests] = useState([])
  const [modalTest, setModalTest] = useState(null)
  const { selectedPackages, togglePackage } = useBooking()
  const addedIds = selectedPackages.map((p) => p.id)

  useEffect(() => {
    let cancelled = false
    fetchFeaturedTests().then((tests) => {
      if (!cancelled) setFeaturedTests(tests)
    })
    return () => {
      cancelled = true
    }
  }, [])

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

        {featuredTests.length > 0 && (
          <BannerCarousel
            items={featuredTests}
            keyFn={(test) => test.code}
            renderItem={(test, index, cardRef) => (
              <BannerCard
                key={test.code}
                cardRef={cardRef}
                index={index}
                image={test.image}
                name={test.name}
                price={test.price}
                onClick={() => setModalTest(test)}
              />
            )}
          />
        )}

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

      {modalTest && (
        <FeaturedTestModal
          test={modalTest}
          isAdded={addedIds.includes(`test-${modalTest.code}`)}
          onAdd={() => {
            togglePackage(testToCartItem(modalTest))
            setModalTest(null)
          }}
          onClose={() => setModalTest(null)}
        />
      )}
    </div>
  )
}
