import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPackages, fetchPopularTests, fetchAllTests } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { CheckIcon, PlusIcon, ArrowIcon, SearchIcon, CartIcon, ShieldIcon } from '../components/icons'
import { useBooking } from '../context/BookingContext'
import BannerCarousel from '../components/BannerCarousel'
import BannerCard from '../components/BannerCard'
import '../styles/modal.css'
import './Packages.css'

function PackageModal({ pkg, isAdded, onAdd, onClose }) {
  return (
    <div className="pkg-modal__overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        <img className="pkg-modal__img" src={pkg.image} alt="" />
        <div className="pkg-modal__body">
          <h3 className="pkg-modal__name">{pkg.name}</h3>
          <span className="pkg-modal__meta">{pkg.testCount} تحليل</span>
          <span className="pkg-modal__price">{pkg.price.toLocaleString('en-US')} جنيه</span>
          <div className="pkg-modal__tests">
            {pkg.tests.map((test) => (
              <span key={test} className="pkg-modal__tag">
                {test}
              </span>
            ))}
          </div>
          <button className={`pkg-modal__cta${isAdded ? ' added' : ''}`} onClick={onAdd}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
            {isAdded ? 'تمت الإضافة للحجز' : 'أضف للحجز'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TestRow({ test, isAdded, onAdd }) {
  return (
    <div className="test-row">
      <button
        className={`test-row__add${isAdded ? ' added' : ''}`}
        onClick={onAdd}
        aria-label={isAdded ? 'تمت الإضافة' : 'أضف للحجز'}
      >
        {isAdded ? <CheckIcon /> : <PlusIcon />}
      </button>
      <span className="test-row__name">{test.name}</span>
      <span className="test-row__price">
        {test.price.toLocaleString('en-US')}
        <small>جنيه</small>
      </span>
    </div>
  )
}

export default function Packages() {
  const [query, setQuery] = useState('')
  const [modalPkg, setModalPkg] = useState(null)
  const [packages, setPackages] = useState([])
  const [popularTests, setPopularTests] = useState([])
  const [allTests, setAllTests] = useState([])
  const [loading, setLoading] = useState(true)
  const { selectedPackages, togglePackage } = useBooking()
  const addedIds = selectedPackages.map((p) => p.id)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPackages(), fetchPopularTests(), fetchAllTests()]).then(
      ([pkgs, popular, tests]) => {
        if (cancelled) return
        setPackages(pkgs)
        setPopularTests(popular)
        setAllTests(tests)
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return allTests.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 40)
  }, [query, allTests])

  const isSearching = query.trim().length > 0

  return (
    <div className="packages">
      <section className="packages__hero">
        <span className="packages__blob packages__blob--1" />

        <div className="packages__topbar">
          <h1 className="packages__title">الباقات والتحاليل</h1>
          <Link className="packages__cart-icon" to="/booking" aria-label="السلة">
            <CartIcon />
            {selectedPackages.length > 0 && (
              <span className="packages__cart-badge">{selectedPackages.length}</span>
            )}
          </Link>
        </div>

        <div className="packages__search">
          <span className="packages__search-icon">
            <SearchIcon />
          </span>
          <input
            className="packages__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أي تحليل بالاسم..."
          />
        </div>

        <Link className="packages__prep-link" to="/prep-instructions">
          <ShieldIcon width={18} height={18} />
          شروط تحضير التحاليل
        </Link>
      </section>

      {loading ? (
        <p className="packages__loading">جاري تحميل الباقات والتحاليل...</p>
      ) : isSearching ? (
        <div className="packages__search-results">
          {searchResults.length === 0 ? (
            <p className="packages__no-results">مفيش تحاليل مطابقة لبحثك، جرّب اسم مختلف.</p>
          ) : (
            searchResults.map((test) => (
              <TestRow
                key={test.code}
                test={test}
                isAdded={addedIds.includes(`test-${test.code}`)}
                onAdd={() => togglePackage(testToCartItem(test))}
              />
            ))
          )}
        </div>
      ) : (
        <>
          <div className="packages__section-head">
            <span className="packages__section-head-link">الكل</span>
            <span className="packages__section-head-title">الباقات</span>
          </div>
          <BannerCarousel
            items={packages}
            keyFn={(pkg) => pkg.id}
            renderItem={(pkg, index, cardRef) => (
              <BannerCard
                key={pkg.id}
                cardRef={cardRef}
                index={index}
                image={pkg.image}
                name={pkg.name}
                price={pkg.price}
                onClick={() => setModalPkg(pkg)}
              />
            )}
          />

          <div className="packages__section-head">
            <span className="packages__section-head-link">الكل</span>
            <span className="packages__section-head-title">تحاليل</span>
          </div>
          <div className="packages__popular-list">
            {popularTests.map((test) => (
              <TestRow
                key={test.code}
                test={test}
                isAdded={addedIds.includes(`test-${test.code}`)}
                onAdd={() => togglePackage(testToCartItem(test))}
              />
            ))}
          </div>
        </>
      )}

      {selectedPackages.length > 0 && (
        <Link className="packages__cart-bar" to="/booking">
          <span>{selectedPackages.length} عنصر مضاف للحجز</span>
          <span className="packages__cart-cta">
            كمّل الحجز
            <ArrowIcon />
          </span>
        </Link>
      )}

      {modalPkg && (
        <PackageModal
          pkg={modalPkg}
          isAdded={addedIds.includes(modalPkg.id)}
          onAdd={() => {
            togglePackage(modalPkg)
            setModalPkg(null)
          }}
          onClose={() => setModalPkg(null)}
        />
      )}
    </div>
  )
}
