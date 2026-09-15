import { useEffect, useMemo, useState } from 'react'
import { fetchPrepInstructions } from '../lib/data'
import { SearchIcon, ChevronDownIcon, ShieldIcon } from '../components/icons'
import InternationalNav from '../components/InternationalNav'
import './PrepInstructions.css'

function PrepRow({ item, isOpen, onToggle }) {
  return (
    <div className="prep-row">
      <button className="prep-row__head" onClick={onToggle}>
        <span className="prep-row__name">{item.name}</span>
        <ChevronDownIcon className={`prep-row__chevron${isOpen ? ' open' : ''}`} />
      </button>
      {isOpen && <p className="prep-row__body" dir="rtl">{item.instruction}</p>}
    </div>
  )
}

export default function InternationalPrepInstructions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [openName, setOpenName] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchPrepInstructions().then((map) => {
      if (cancelled) return
      const list = Object.entries(map)
        .map(([name, instruction]) => ({ name, instruction }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setItems(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, query])

  return (
    <div className="prep" dir="ltr" lang="en">
      <section className="prep__hero">
        <span className="prep__blob prep__blob--1" />
        <span className="prep__icon">
          <ShieldIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="prep__title">Test Preparation Instructions</h1>
        <p className="prep__subtitle">Important instructions before your test, so your result comes out accurate</p>
        <p className="prep__subtitle" style={{ opacity: 0.75, fontSize: '12px', marginTop: '4px' }}>
          Instructions below are currently in Arabic — ask our staff to translate if needed.
        </p>

        <div className="prep__search">
          <span className="prep__search-icon">
            <SearchIcon />
          </span>
          <input
            className="prep__search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a test name..."
          />
        </div>
      </section>

      <div className="prep__list">
        {loading ? (
          <p className="prep__loading">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="prep__no-results">No matching tests — try a different name.</p>
        ) : (
          filtered.map((item) => (
            <PrepRow
              key={item.name}
              item={item}
              isOpen={openName === item.name}
              onToggle={() => setOpenName((prev) => (prev === item.name ? null : item.name))}
            />
          ))
        )}
      </div>

      <InternationalNav />
    </div>
  )
}
