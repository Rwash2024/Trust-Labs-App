import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllTestsForeign, fetchPackagesForeign } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { useBooking } from '../context/BookingContext'
import { SearchIcon, CheckIcon, PlusIcon, CartIcon } from '../components/icons'
import InternationalNav from '../components/InternationalNav'
import './International.css'

export default function International() {
  const [tests, setTests] = useState([])
  const [packages, setPackages] = useState([])
  const [query, setQuery] = useState('')
  const { selectedPackages, togglePackage } = useBooking()

  useEffect(() => {
    fetchAllTestsForeign().then(setTests)
    fetchPackagesForeign().then(setPackages)
  }, [])

  const addedIds = selectedPackages.map((p) => p.id)
  const q = query.trim().toLowerCase()
  const filteredTests = q ? tests.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 30) : []

  return (
    <div className="intl" dir="ltr" lang="en">
      <section className="intl__hero">
        <span className="intl__badge">International Patients</span>
        <h1 className="intl__title">Trust Labs</h1>
        <p className="intl__subtitle">Lab tests &amp; packages pricing for non-resident patients</p>
        <Link className="intl__cart-link" to="/international/booking">
          <CartIcon />
          {selectedPackages.length > 0 && <span className="intl__cart-badge">{selectedPackages.length}</span>}
        </Link>
      </section>

      <section className="intl__section intl__quicklinks">
        <Link to="/international/about" className="intl__chip">About Us</Link>
        <Link to="/international/results" className="intl__chip">Test Results</Link>
        <Link to="/international/prep-instructions" className="intl__chip">Prep Instructions</Link>
        <Link to="/international/track-sample" className="intl__chip">Track Sample</Link>
        <Link to="/international/trust-card" className="intl__chip">Trust Card</Link>
        <Link to="/international/news" className="intl__chip">News</Link>
        <Link to="/international/contact" className="intl__chip">Contact Us</Link>
      </section>

      <section className="intl__section">
        <h2 className="intl__section-title">Packages</h2>
        {packages.length === 0 ? (
          <p className="intl__empty">No packages priced for international patients yet.</p>
        ) : (
          <div className="intl__grid">
            {packages.map((pkg) => {
              const isAdded = addedIds.includes(pkg.id)
              return (
                <div className="intl__card" key={pkg.id}>
                  <span className="intl__card-name">{pkg.name}</span>
                  <span className="intl__card-count">{pkg.testCount} tests included</span>
                  <span className="intl__card-price">{pkg.price.toLocaleString('en-US')} EGP</span>
                  <button
                    className={`intl__card-cta${isAdded ? ' added' : ''}`}
                    onClick={() =>
                      togglePackage({ id: pkg.id, name: pkg.name, price: pkg.price, testCount: pkg.testCount, tests: pkg.tests })
                    }
                  >
                    {isAdded ? <CheckIcon /> : <PlusIcon />}
                    {isAdded ? 'Added' : 'Add to booking'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="intl__section">
        <h2 className="intl__section-title">Individual Tests</h2>
        <div className="intl__search">
          <span className="intl__search-icon">
            <SearchIcon />
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a test by name..."
          />
        </div>

        {query.trim() && (
          <div className="intl__test-list">
            {filteredTests.length === 0 ? (
              <p className="intl__empty">No matching tests found.</p>
            ) : (
              filteredTests.map((t) => {
                const isAdded = addedIds.includes(`test-${t.code}`)
                return (
                  <button
                    type="button"
                    key={t.code}
                    className={`intl__test-row${isAdded ? ' added' : ''}`}
                    onClick={() => togglePackage(testToCartItem(t))}
                  >
                    <span className="intl__test-name">{t.name}</span>
                    <span className="intl__test-price">{t.price.toLocaleString('en-US')} EGP</span>
                    <span className="intl__test-icon">{isAdded ? <CheckIcon /> : <PlusIcon />}</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </section>

      <Link className="intl__booking-cta" to="/international/booking">
        Continue to booking
      </Link>

      <InternationalNav />
    </div>
  )
}
