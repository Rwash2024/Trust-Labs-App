import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllTestsForeign, fetchPopularTestsForeign, fetchPackagesForeign } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { useBooking } from '../context/BookingContext'
import { CheckIcon, PlusIcon, ArrowIcon, SearchIcon, CartIcon } from '../components/icons'
import BannerCarousel from '../components/BannerCarousel'
import BannerCard from '../components/BannerCard'
import InternationalNav from '../components/InternationalNav'
import '../styles/modal.css'
import './Packages.css'
import './International.css'

function PackageModal({ pkg, isAdded, onAdd, onClose }) {
  return (
    <div className="pkg-modal__overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={(e) => e.stopPropagation()}>
        {pkg.image && <img className="pkg-modal__img" src={pkg.image} alt="" />}
        <div className="pkg-modal__body">
          <h3 className="pkg-modal__name">{pkg.name}</h3>
          <span className="pkg-modal__meta">{pkg.testCount} tests</span>
          <span className="pkg-modal__price">{pkg.price.toLocaleString('en-US')} EGP</span>
          <div className="pkg-modal__tests">
            {pkg.tests.map((test) => (
              <span key={test} className="pkg-modal__tag">
                {test}
              </span>
            ))}
          </div>
          <button className={`pkg-modal__cta${isAdded ? ' added' : ''}`} onClick={onAdd}>
            {isAdded ? <CheckIcon /> : <PlusIcon />}
            {isAdded ? 'Added to booking' : 'Add to booking'}
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
        aria-label={isAdded ? 'Added' : 'Add to booking'}
      >
        {isAdded ? <CheckIcon /> : <PlusIcon />}
      </button>
      <span className="test-row__name">{test.name}</span>
      <span className="test-row__price">
        {test.price.toLocaleString('en-US')}
        <small>EGP</small>
      </span>
    </div>
  )
}

export default function International() {
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
    Promise.all([fetchPackagesForeign(), fetchPopularTestsForeign(), fetchAllTestsForeign()]).then(
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
    <div className="intl" dir="ltr" lang="en">
      <section className="packages__hero">
        <span className="packages__blob packages__blob--1" />

        <div className="packages__topbar">
          <h1 className="packages__title">Trust Labs</h1>
          <Link className="packages__cart-icon" to="/international/booking" aria-label="Cart">
            <CartIcon />
            {selectedPackages.length > 0 && <span className="packages__cart-badge">{selectedPackages.length}</span>}
          </Link>
        </div>
        <p className="intl__hero-note">International patient pricing</p>

        <div className="packages__search">
          <span className="packages__search-icon">
            <SearchIcon />
          </span>
          <input
            className="packages__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any test by name..."
          />
        </div>
      </section>

      <section className="intl__quicklinks">
        <Link to="/international/about" className="intl__chip">About Us</Link>
        <Link to="/international/results" className="intl__chip">Test Results</Link>
        <Link to="/international/prep-instructions" className="intl__chip">Prep Instructions</Link>
        <Link to="/international/track-sample" className="intl__chip">Track Sample</Link>
        <Link to="/international/trust-card" className="intl__chip">Trust Card</Link>
        <Link to="/international/news" className="intl__chip">News</Link>
        <Link to="/international/contact" className="intl__chip">Contact Us</Link>
      </section>

      {loading ? (
        <p className="packages__loading">Loading packages &amp; tests...</p>
      ) : isSearching ? (
        <div className="packages__search-results">
          {searchResults.length === 0 ? (
            <p className="packages__no-results">No matching tests — try a different name.</p>
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
            <span className="packages__section-head-link">All</span>
            <span className="packages__section-head-title">Packages</span>
          </div>
          {packages.length === 0 ? (
            <p className="packages__no-results">No packages priced for international patients yet.</p>
          ) : (
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
                  currency="EGP"
                  onClick={() => setModalPkg(pkg)}
                />
              )}
            />
          )}

          <div className="packages__section-head">
            <span className="packages__section-head-link">All</span>
            <span className="packages__section-head-title">Popular Tests</span>
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
        <Link className="packages__cart-bar" to="/international/booking">
          <span>{selectedPackages.length} item(s) added</span>
          <span className="packages__cart-cta">
            Continue booking
            <ArrowIcon style={{ transform: 'scaleX(-1)' }} />
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

      <InternationalNav />
    </div>
  )
}
