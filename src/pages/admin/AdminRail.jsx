import { useEffect, useRef, useState } from 'react'
import brand from '../../brand'
import Icon from './AdminIcons'
import './AdminShell.css'
import './AdminMotion.css'

// The floating sidebar capsule shared by the admin dashboard and the staff (branch / call-center)
// dashboard. `tabs` need an `icon`; `moreTabs` (optional) are listed under a "المزيد" menu.
export function AdminRail({ tabs, moreTabs = [], activeTab, onPick, onSignOut }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreTop, setMoreTop] = useState(0)
  const moreRef = useRef(null)
  const menuRef = useRef(null)
  const activeInMore = moreTabs.some((t) => t.key === activeTab)

  useEffect(() => {
    if (!moreOpen) return undefined
    const close = (e) => {
      if (!moreRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreOpen])

  const pick = (key) => {
    onPick(key)
    setMoreOpen(false)
  }

  const toggleMore = () => {
    const rect = moreRef.current?.getBoundingClientRect()
    if (rect) setMoreTop(Math.max(12, Math.min(rect.top, window.innerHeight - 24 - moreTabs.length * 44)))
    setMoreOpen((o) => !o)
  }

  return (
    <>
      <aside className="admin-rail">
        <span className="admin-rail__mark">{brand.name?.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>

        {tabs.map((t) => (
          <button
            key={t.key}
            className={`admin-rail__btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => pick(t.key)}
            aria-label={t.label}
          >
            <Icon name={t.icon} />
            <i>{t.label}</i>
          </button>
        ))}

        {moreTabs.length > 0 && (
          <button
            ref={moreRef}
            className={`admin-rail__btn${activeInMore || moreOpen ? ' active' : ''}`}
            onClick={toggleMore}
            aria-expanded={moreOpen}
            aria-label="المزيد"
          >
            <Icon name="more" />
            <i>المزيد</i>
          </button>
        )}

        <span className="admin-rail__spacer" />
        <button className="admin-rail__btn" onClick={onSignOut} aria-label="تسجيل الخروج">
          <Icon name="logout" />
          <i>تسجيل الخروج</i>
        </button>
      </aside>

      {moreOpen && (
        <div className="admin-rail__menu" ref={menuRef} style={{ top: moreTop }}>
          {moreTabs.map((t) => (
            <button
              key={t.key}
              className={`admin-rail__item${activeTab === t.key ? ' active' : ''}`}
              onClick={() => pick(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export function AdminTopbar({ email = '', title }) {
  return (
    <div className="admin-topbar">
      <span className="admin-topbar__brand">{title || `${brand.name} · لوحة التحكم`}</span>
      <span className="admin-topbar__user">
        <span>{email}</span>
        <b>{email.charAt(0).toUpperCase()}</b>
      </span>
    </div>
  )
}
