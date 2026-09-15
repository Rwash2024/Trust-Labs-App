import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBranchGroups } from '../lib/data'
import { MapPinIcon, PhoneIcon, WhatsAppIcon, ChevronDownIcon, CartIcon } from '../components/icons'
import { useBooking } from '../context/BookingContext'
import InternationalNav from '../components/InternationalNav'
import './Branches.css'

function parseHours(hoursText) {
  if (!hoursText) return []
  return hoursText.split('|').map((part) => {
    const [label, ...rest] = part.split(':')
    return { label: label.trim(), value: rest.join(':').trim() }
  })
}

function BranchCard({ branch }) {
  const hoursRows = parseHours(branch.hours)

  return (
    <div className="branch-card">
      <div className="branch-card__head">
        <span className="branch-card__icon">
          <MapPinIcon color="#fff" />
        </span>
        <span className="branch-card__info">
          <span className="branch-card__title">{branch.name}</span>
          <span className="branch-card__address">{branch.address}</span>
        </span>
      </div>

      <div className="branch-card__hours-box">
        <span className="branch-card__hours-title">Working hours</span>
        {hoursRows.map((row) => (
          <div className="branch-card__hours-row" key={row.label}>
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
        ))}
      </div>

      <div className="branch-card__actions">
        <a className="branch-card__action" href={`tel:${branch.phone}`}>
          <PhoneIcon />
          {branch.phone}
        </a>
        <a
          className="branch-card__action branch-card__action--whatsapp"
          href={branch.whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
        <a
          className="branch-card__action branch-card__action--primary"
          href={branch.mapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MapPinIcon />
          Get directions
        </a>
      </div>
    </div>
  )
}

function GovernorateGroup({ group, isOpen, onToggle }) {
  return (
    <div className="branch-group">
      <button className="branch-group__head" onClick={onToggle}>
        <span className="branch-group__title">{group.governorate}</span>
        <span className="branch-group__count">
          {group.list.length} {group.list.length === 1 ? 'branch' : 'branches'}
        </span>
        <ChevronDownIcon className={`branch-group__chevron${isOpen ? ' open' : ''}`} />
      </button>
      {isOpen && (
        <div className="branch-group__list">
          {group.list.map((branch) => (
            <BranchCard key={branch.name} branch={branch} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function InternationalBranches() {
  const [branches, setBranches] = useState([])
  const [openGov, setOpenGov] = useState(null)
  const { selectedPackages } = useBooking()

  useEffect(() => {
    let cancelled = false
    fetchBranchGroups().then((groups) => {
      if (cancelled) return
      setBranches(groups)
      setOpenGov(groups[0]?.governorate ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="branches" dir="ltr" lang="en">
      <section className="branches__hero">
        <span className="branches__blob branches__blob--1" />

        <div className="branches__topbar">
          <h1 className="branches__title">Our Branches</h1>
          <Link className="branches__cart-icon" to="/international/booking" aria-label="Cart">
            <CartIcon />
            {selectedPackages.length > 0 && (
              <span className="branches__cart-badge">{selectedPackages.length}</span>
            )}
          </Link>
        </div>
        <p className="branches__subtitle">Choose a governorate to see the nearest branches</p>
      </section>

      <div className="branches__list">
        {branches.map((group) => (
          <GovernorateGroup
            key={group.governorate}
            group={group}
            isOpen={openGov === group.governorate}
            onToggle={() => setOpenGov((prev) => (prev === group.governorate ? null : group.governorate))}
          />
        ))}
      </div>

      <InternationalNav />
    </div>
  )
}
