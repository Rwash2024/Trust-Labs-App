import { useEffect, useRef, useState } from 'react'
import brand from '../../brand'
import { useAdminAuth } from '../../context/AdminAuthContext'
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
import logoWhiteFull from '@client/logo-white-full.png'
import './Admin.css'

const trustOnly = ['trust-card', 'complaints', 'ratings']
const allTabs = [
  { key: 'packages', label: 'الباقات' },
  { key: 'tests', label: 'التحاليل' },
  { key: 'featured', label: 'تحاليل مميزة' },
  { key: 'branches', label: 'الفروع' },
  { key: 'prep', label: 'شروط التحاليل' },
  { key: 'news', label: 'أخبار المعمل' },
  { key: 'partners', label: 'شركاء النجاح' },
  { key: 'about', label: 'من نحن' },
  { key: 'trust-card', label: 'كارت الثقة' },
  { key: 'samples', label: 'تتبع العينات' },
  { key: 'bookings', label: 'الحجوزات' },
  { key: 'complaints', label: 'شكاوى واقتراحات' },
  { key: 'ratings', label: 'قيّم زيارتك' },
  { key: 'reports', label: '📊 تقارير' },
]
const tabs = allTabs.filter((t) => brand.features?.trustCard || !trustOnly.includes(t.key))
// The most-used sections stay in the floating bar; the rest live under "المزيد".
const primaryKeys = ['packages', 'tests', 'branches', 'bookings', 'reports']
const primaryTabs = tabs.filter((t) => primaryKeys.includes(t.key))
const moreTabs = tabs.filter((t) => !primaryKeys.includes(t.key))

export default function AdminDashboard() {
  const { session, signOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('packages')
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const activeInMore = moreTabs.some((t) => t.key === activeTab)

  useEffect(() => {
    if (!moreOpen) return undefined
    const close = (e) => { if (!moreRef.current?.contains(e.target)) setMoreOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [moreOpen])

  const pick = (key) => { setActiveTab(key); setMoreOpen(false) }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoWhiteFull} alt={brand.name} />
          <span>لوحة التحكم</span>
        </div>

        <nav className="admin-tabs">
          {primaryTabs.map((t) => (
            <button
              key={t.key}
              className={`admin-tabs__btn${activeTab === t.key ? ' active' : ''}`}
              onClick={() => pick(t.key)}
            >
              {t.label}
            </button>
          ))}
          {moreTabs.length > 0 && (
            <div className="admin-tabs__more" ref={moreRef}>
              <button
                className={`admin-tabs__btn${activeInMore ? ' active' : ''}`}
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
              >
                {activeInMore ? tabs.find((t) => t.key === activeTab).label : 'المزيد'} ▾
              </button>
              {moreOpen && (
                <div className="admin-tabs__menu">
                  {moreTabs.map((t) => (
                    <button
                      key={t.key}
                      className={`admin-tabs__item${activeTab === t.key ? ' active' : ''}`}
                      onClick={() => pick(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="admin-header__user">
          <span>{session?.user?.email}</span>
          <button onClick={signOut}>تسجيل الخروج</button>
        </div>
      </header>

      <main className="admin-content">
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
