import { useEffect, useRef, useState } from 'react'
import brand from '../../brand'
import { useAdminAuth } from '../../context/AdminAuthContext'
import Icon from './AdminIcons'
import OverviewTab from './OverviewTab'
import PackagesTab from './PackagesTab'
import TestsTab from './TestsTab'
import FeaturedTestsTab from './FeaturedTestsTab'
import BranchesTab from './BranchesTab'
import PrepTab from './PrepTab'
import AboutTab from './AboutTab'
import SampleTrackingTab from './SampleTrackingTab'
import NewsTab from './NewsTab'
import PartnersTab from './PartnersTab'
import ComplaintsTab from './ComplaintsTab'
import BookingsTab from './BookingsTab'
import VisitRatingsTab from './VisitRatingsTab'
import TrustCardTab from './TrustCardTab'
import ReportsTab from './ReportsTab'
import './Admin.css'
import './AdminShell.css'
import './AdminMotion.css'

const trustOnly = ['trust-card', 'complaints', 'ratings']
// Tabs with an `icon` live on the sidebar capsule; the rest are listed under "المزيد".
const allTabs = [
  { key: 'overview', label: 'نظرة عامة', icon: 'home' },
  { key: 'bookings', label: 'الحجوزات', icon: 'calendar' },
  { key: 'packages', label: 'الباقات', icon: 'box' },
  { key: 'tests', label: 'التحاليل', icon: 'flask' },
  { key: 'branches', label: 'الفروع', icon: 'pin' },
  { key: 'trust-card', label: 'كارت الثقة', icon: 'card' },
  { key: 'samples', label: 'تتبع العينات', icon: 'drop' },
  { key: 'complaints', label: 'شكاوى واقتراحات', icon: 'message' },
  { key: 'ratings', label: 'قيّم زيارتك', icon: 'star' },
  { key: 'reports', label: 'تقارير', icon: 'chart' },
  { key: 'featured', label: 'تحاليل مميزة' },
  { key: 'prep', label: 'شروط التحاليل' },
  { key: 'news', label: 'أخبار المعمل' },
  { key: 'partners', label: 'شركاء النجاح' },
  { key: 'about', label: 'من نحن' },
]
const tabs = allTabs.filter((t) => brand.features?.trustCard || !trustOnly.includes(t.key))
const railTabs = tabs.filter((t) => t.icon)
const moreTabs = tabs.filter((t) => !t.icon)

export default function AdminDashboard() {
  const { session, signOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [moreOpen, setMoreOpen] = useState(false)
  const [moreTop, setMoreTop] = useState(0)
  const moreRef = useRef(null)
  const menuRef = useRef(null)
  const activeInMore = moreTabs.some((t) => t.key === activeTab)
  const email = session?.user?.email || ''

  useEffect(() => {
    if (!moreOpen) return undefined
    const close = (e) => {
      if (!moreRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreOpen])

  const pick = (key) => {
    setActiveTab(key)
    setMoreOpen(false)
  }

  const toggleMore = () => {
    const rect = moreRef.current?.getBoundingClientRect()
    if (rect) setMoreTop(Math.max(12, Math.min(rect.top, window.innerHeight - 24 - moreTabs.length * 44)))
    setMoreOpen((o) => !o)
  }

  return (
    <div className="admin-dashboard admin-dashboard--rail">
      <aside className="admin-rail">
        <span className="admin-rail__mark">{brand.name?.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>

        {railTabs.map((t) => (
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
        <button className="admin-rail__btn" onClick={signOut} aria-label="تسجيل الخروج">
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

      <div className="admin-topbar">
        <span className="admin-topbar__brand">{brand.name} · لوحة التحكم</span>
        <span className="admin-topbar__user">
          <span>{email}</span>
          <b>{email.charAt(0).toUpperCase()}</b>
        </span>
      </div>

      <main className="admin-content" key={activeTab}>
        {activeTab === 'overview' && <OverviewTab onNavigate={pick} />}
        {activeTab === 'packages' && <PackagesTab />}
        {activeTab === 'tests' && <TestsTab />}
        {activeTab === 'featured' && <FeaturedTestsTab />}
        {activeTab === 'branches' && <BranchesTab />}
        {activeTab === 'prep' && <PrepTab />}
        {activeTab === 'news' && <NewsTab />}
        {activeTab === 'partners' && <PartnersTab />}
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'trust-card' && <TrustCardTab />}
        {activeTab === 'samples' && <SampleTrackingTab canManage />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'complaints' && <ComplaintsTab />}
        {activeTab === 'ratings' && <VisitRatingsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  )
}
