import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBooking } from '../context/BookingContext'
import { fetchBranchGroups, fetchAllTestsForeign } from '../lib/data'
import { testToCartItem } from '../lib/cart'
import { FlaskIcon, MapPinIcon, CheckIcon, SearchIcon, PlusIcon } from '../components/icons'
import InternationalNav from '../components/InternationalNav'
import './InternationalBooking.css'

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID
const FORMSPREE_ENDPOINT = FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : null
const HOME_VISIT_FEE = 113 // 75 EGP local fee x1.5 foreign-patient rate

// International phone numbers vary in length/format — just check it has a
// sensible number of digits, not the Egyptian-specific 01xxxxxxxxx pattern.
function isValidInternationalPhone(value) {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

function generateBookingRef() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const randomDigits = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `TL-INTL-${dateStr}${randomDigits}`
}

export default function InternationalBooking() {
  const { selectedPackages, togglePackage, removePackage, clearCart } = useBooking()
  const [mode, setMode] = useState('home')
  const [status, setStatus] = useState('idle')
  const [form, setForm] = useState({ name: '', phone: '', dob: '', address: '', branchName: '', date: '', notes: '' })
  const [testQuery, setTestQuery] = useState('')
  const [allBranches, setAllBranches] = useState([])
  const [allTests, setAllTests] = useState([])
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchBranchGroups(), fetchAllTestsForeign()]).then(([groups, tests]) => {
      if (cancelled) return
      setAllBranches(groups.flatMap((g) => g.list.map((b) => ({ ...b, governorate: g.governorate }))))
      setAllTests(tests)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const addedIds = selectedPackages.map((p) => p.id)
  const subtotal = selectedPackages.reduce((sum, p) => sum + p.price, 0)
  const homeVisitFee = mode === 'home' ? HOME_VISIT_FEE : 0
  const total = subtotal + homeVisitFee

  const testSearchResults = useMemo(() => {
    const q = testQuery.trim().toLowerCase()
    if (!q) return []
    return allTests.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 30)
  }, [testQuery, allTests])

  const updateField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
  const isPhoneValid = isValidInternationalPhone(form.phone)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isPhoneValid) {
      setStatus('invalid-phone')
      return
    }
    if (!agreedToTerms) {
      setStatus('terms-required')
      return
    }
    if (!FORMSPREE_ENDPOINT) {
      setStatus('error')
      return
    }

    setStatus('submitting')
    const bookingType = mode === 'home' ? 'Home visit' : 'Branch visit'
    const branchLabel = mode === 'branch' ? form.branchName : 'Home visit'
    const bookingRef = generateBookingRef()

    const data = new FormData()
    data.append('bookingRef', bookingRef)
    data.append('patientCategory', 'International patient')
    data.append('name', form.name)
    data.append('phone', form.phone)
    data.append('dob', form.dob)
    data.append('bookingType', bookingType)
    if (mode === 'home') data.append('address', form.address)
    if (mode === 'branch') data.append('branch', form.branchName)
    data.append('date', form.date)
    data.append('notes', form.notes)
    data.append('packages', selectedPackages.map((p) => p.name).join(', '))
    data.append('subtotal', subtotal)
    data.append('homeVisitFee', homeVisitFee)
    data.append('total', total)
    data.append('paymentMethod', 'Cash')

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
      if (!res.ok) throw new Error(`submit failed: ${res.status}`)

      setReceipt({
        bookingRef,
        branchLabel,
        name: form.name,
        dob: form.dob,
        phone: form.phone,
        address: mode === 'home' ? form.address : null,
        date: form.date,
        packages: selectedPackages.map((p) => p.name),
        subtotal,
        homeVisitFee,
        total,
        mode,
      })
      clearCart()
      setStatus('success')
    } catch (err) {
      console.error('International booking submission error', err)
      setStatus('error')
    }
  }

  if (status === 'success' && receipt) {
    return (
      <div className="ibooking ibooking--done" dir="ltr" lang="en">
        <span className="ibooking__done-icon">
          <CheckIcon />
        </span>
        <h1>Booking request sent</h1>
        <p>Our customer care team will contact you shortly to confirm your appointment.</p>

        <div className="ibooking__receipt">
          <div className="ibooking__receipt-header">
            <span className="ibooking__receipt-brand">Trust Labs</span>
            <span className="ibooking__receipt-branch">{receipt.branchLabel}</span>
          </div>

          <div className="ibooking__receipt-row"><span>Patient name</span><span>{receipt.name}</span></div>
          <div className="ibooking__receipt-row"><span>Date of birth</span><span>{receipt.dob || '—'}</span></div>
          <div className="ibooking__receipt-row"><span>Phone</span><span dir="ltr">{receipt.phone}</span></div>
          {receipt.address && <div className="ibooking__receipt-row"><span>Address</span><span>{receipt.address}</span></div>}

          <div className="ibooking__receipt-divider" />

          <div className="ibooking__receipt-row ibooking__receipt-row--block">
            <span>Tests / packages</span>
            <span>{receipt.packages.join(', ') || '—'}</span>
          </div>
          <div className="ibooking__receipt-row"><span>Preferred date</span><span>{receipt.date}</span></div>

          <div className="ibooking__receipt-divider" />

          <div className="ibooking__receipt-row"><span>Subtotal</span><span>{receipt.subtotal.toLocaleString('en-US')} EGP</span></div>
          {receipt.mode === 'home' && (
            <div className="ibooking__receipt-row"><span>Home visit fee</span><span>{receipt.homeVisitFee.toLocaleString('en-US')} EGP</span></div>
          )}
          <div className="ibooking__receipt-row ibooking__receipt-row--total"><span>Total</span><span>{receipt.total.toLocaleString('en-US')} EGP</span></div>

          <div className="ibooking__receipt-ref">Booking reference: {receipt.bookingRef}</div>
        </div>

        <Link className="ibooking__done-cta" to="/international">
          Back to packages
        </Link>

        <InternationalNav />
      </div>
    )
  }

  return (
    <div className="ibooking" dir="ltr" lang="en">
      <section className="ibooking__hero">
        <span className="ibooking__blob" />
        <h1 className="ibooking__title">Book an appointment</h1>
        <p className="ibooking__subtitle">Choose a booking type and fill in your details — our team will confirm by phone</p>
      </section>

      <div className="ibooking__body">
        <div className="ibooking__toggle">
          <button type="button" className={`ibooking__toggle-btn${mode === 'home' ? ' active' : ''}`} onClick={() => setMode('home')}>
            Home visit
          </button>
          <button type="button" className={`ibooking__toggle-btn${mode === 'branch' ? ' active' : ''}`} onClick={() => setMode('branch')}>
            Book at a branch
          </button>
        </div>

        <div className="ibooking__tests-picker">
          <h2 className="ibooking__section-title">Tests required</h2>
          <div className="ibooking__tests-search">
            <span className="ibooking__tests-search-icon">
              <SearchIcon />
            </span>
            <input
              className="ibooking__tests-search-input"
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Search a test by name..."
            />
          </div>

          {testQuery.trim() && (
            <div className="ibooking__tests-results">
              {testSearchResults.length === 0 ? (
                <p className="ibooking__tests-no-results">No matching tests found.</p>
              ) : (
                testSearchResults.map((test) => {
                  const isAdded = addedIds.includes(`test-${test.code}`)
                  return (
                    <button
                      type="button"
                      key={test.code}
                      className={`ibooking__test-row${isAdded ? ' added' : ''}`}
                      onClick={() => togglePackage(testToCartItem(test))}
                    >
                      <span className="ibooking__test-row-name">{test.name}</span>
                      <span className="ibooking__test-row-price">{test.price.toLocaleString('en-US')} EGP</span>
                      <span className="ibooking__test-row-icon">{isAdded ? <CheckIcon /> : <PlusIcon />}</span>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {selectedPackages.length > 0 && (
          <div className="ibooking__cart">
            <h2 className="ibooking__section-title">Selected tests &amp; packages</h2>
            {selectedPackages.map((pkg) => (
              <div className="ibooking__cart-item" key={pkg.id}>
                <span className="ibooking__cart-icon">
                  <FlaskIcon color="#fff" />
                </span>
                <span className="ibooking__cart-info">
                  <span className="ibooking__cart-name">{pkg.name}</span>
                  <span className="ibooking__cart-price">{pkg.price.toLocaleString('en-US')} EGP</span>
                </span>
                <button type="button" className="ibooking__cart-remove" onClick={() => removePackage(pkg.id)}>
                  Remove
                </button>
              </div>
            ))}

            <div className="ibooking__total">
              <div className="ibooking__total-row"><span>Tests &amp; packages</span><span>{subtotal.toLocaleString('en-US')} EGP</span></div>
              {mode === 'home' && (
                <div className="ibooking__total-row"><span>Home visit fee</span><span>{HOME_VISIT_FEE.toLocaleString('en-US')} EGP</span></div>
              )}
              <div className="ibooking__total-row ibooking__total-row--final"><span>Total</span><span>{total.toLocaleString('en-US')} EGP</span></div>
            </div>
          </div>
        )}

        <div className="ibooking__payment">
          <h2 className="ibooking__section-title">Payment</h2>
          <p className="ibooking__payment-hint">
            {mode === 'home'
              ? 'Cash payment to our home-visit technician on arrival.'
              : 'Cash payment at the branch reception.'}
          </p>
        </div>

        <form className="ibooking__form" onSubmit={handleSubmit}>
          <label className="ibooking__field">
            <span>Full name</span>
            <input required type="text" value={form.name} onChange={updateField('name')} placeholder="Your full name" />
          </label>

          <label className="ibooking__field">
            <span>Phone number (with country code)</span>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={updateField('phone')}
              placeholder="+1 555 000 1234"
              aria-invalid={form.phone.length > 0 && !isPhoneValid}
            />
            {form.phone.length > 0 && !isPhoneValid && (
              <span className="ibooking__field-error">Please enter a valid phone number (8–15 digits).</span>
            )}
          </label>

          <label className="ibooking__field">
            <span>Date of birth</span>
            <input required type="date" value={form.dob} onChange={updateField('dob')} />
          </label>

          {mode === 'home' ? (
            <label className="ibooking__field">
              <span>Full address</span>
              <textarea required rows={3} value={form.address} onChange={updateField('address')} placeholder="Hotel / resort name, room number, area..." />
            </label>
          ) : (
            <label className="ibooking__field">
              <span>Choose a branch</span>
              <select required value={form.branchName} onChange={updateField('branchName')}>
                <option value="" disabled>Select the nearest branch</option>
                {allBranches.map((b) => (
                  <option key={b.name} value={b.name}>{b.governorate} — {b.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="ibooking__field">
            <span>Preferred date</span>
            <input required type="date" value={form.date} onChange={updateField('date')} />
          </label>

          <label className="ibooking__field">
            <span>Notes (optional)</span>
            <textarea rows={2} value={form.notes} onChange={updateField('notes')} placeholder="Any additional details" />
          </label>

          {status === 'invalid-phone' && (
            <p className="ibooking__error">Please enter a valid phone number before confirming.</p>
          )}

          <label className="ibooking__terms">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => {
                setAgreedToTerms(e.target.checked)
                if (e.target.checked && status === 'terms-required') setStatus('idle')
              }}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>
            </span>
          </label>

          {status === 'terms-required' && (
            <p className="ibooking__error">Please agree to the Terms &amp; Conditions before confirming.</p>
          )}

          {status === 'error' && (
            <p className="ibooking__error">Something went wrong sending your request. Please try again.</p>
          )}

          <button className="ibooking__submit" type="submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Sending...' : 'Confirm booking'}
          </button>
        </form>
      </div>

      <InternationalNav />
    </div>
  )
}
