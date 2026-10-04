import { useEffect, useState } from 'react'
import brand from '../brand'
import { priceText, showPrices } from '../lib/price'
import { Link } from 'react-router-dom'
import { FlaskIcon, MapPinIcon, WhatsAppIcon, CalendarIcon, CartIcon, SearchIcon, ArrowIcon, InfoIcon, ResultsIcon, CheckIcon, PlusIcon, ShieldIcon, NewsIcon } from '../components/icons'
import BannerCarousel from '../components/BannerCarousel'
import BannerCard from '../components/BannerCard'
import { fetchFeaturedTests, fetchPartners } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { useBooking } from '../context/BookingContext'
import logoWhiteFull from '@client/logo-white-full.png'
import { staticPartnerLogos } from '@client/data/partners'
import '../styles/modal.css'
import './Home.css'

const insuranceMessage = encodeURIComponent('السلام عليكم، عندي استفسار بخصوص موافقات التأمين الطبي.')
const whatsappUrl = `https://wa.me/${brand.whatsapp}?text=${insuranceMessage}`

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
          <span className="pkg-modal__price">{priceText(test.price)}</span>
          <button className={`pkg-modal__cta${isAdded ? ' added' : ''}`} onClick={onAdd}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
            {isAdded ? 'تمت الإضافة للحجز' : 'أضف للحجز'}
          </button>
          <Link className="pkg-modal__secondary" to="/packages">
            المزيد من التحاليل
          </Link>
        </div>
      </div>
    </div>
  )
}


const quickLinks = [
  { to: '/booking', label: 'احجز موعدك', Icon: CalendarIcon },
  { href: whatsappUrl, label: 'موافقات التأمين', Icon: WhatsAppIcon },
  { to: '/prep-instructions', label: 'شروط التحاليل', Icon: ShieldIcon },
  { to: '/branches', label: 'فروعنا', Icon: MapPinIcon },
  { to: '/news', label: 'أخبار المعمل', Icon: NewsIcon },
  { to: '/about', label: 'من نحن', Icon: InfoIcon },
].filter((link) => link.to || brand.whatsapp)

export default function Home() {
  const [featuredTests, setFeaturedTests] = useState([])
  const [partnerLogos, setPartnerLogos] = useState(staticPartnerLogos)
  const [modalTest, setModalTest] = useState(null)
  const { selectedPackages, togglePackage } = useBooking()
  const addedIds = selectedPackages.map((p) => p.id)

  useEffect(() => {
    let cancelled = false
    fetchFeaturedTests().then((tests) => {
      if (!cancelled) setFeaturedTests(tests)
    })
    fetchPartners(staticPartnerLogos).then((partners) => {
      if (!cancelled) setPartnerLogos(partners)
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
          <img className="home__logo" src={logoWhiteFull} alt={brand.name} />
          <Link className="home__bell" to="/booking" aria-label="السلة">
            <CartIcon />
            {selectedPackages.length > 0 && <span className="home__cart-badge">{selectedPackages.length}</span>}
          </Link>
        </div>

        <h1 className="home__greeting">
          أهلاً بيك في {brand.name}
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

      {brand.features?.trustCard && (
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
      )}

      <section className="home__section">
        <h2 className="home__section-title home__section-title--center">شركاء النجاح</h2>
        <div className="partners-grid">
          {partnerLogos.map((partner, i) => (
            <div className="partners-grid__logo" key={partner.name} style={{ animationDelay: `${i * 70}ms` }}>
              <span className="partners-grid__glow" />
              {partner.src ? <img src={partner.src} alt={partner.name} /> : <span className="partners-grid__name">{partner.name}</span>}
            </div>
          ))}
        </div>
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
