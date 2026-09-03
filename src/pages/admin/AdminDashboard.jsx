import { useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import PackagesTab from './PackagesTab'
import TestsTab from './TestsTab'
import FeaturedTestsTab from './FeaturedTestsTab'
import BranchesTab from './BranchesTab'
import PrepTab from './PrepTab'
import AboutTab from './AboutTab'
import logoWhiteFull from '../../assets/logo-white-full.png'
import './Admin.css'

const tabs = [
  { key: 'packages', label: 'الباقات' },
  { key: 'tests', label: 'التحاليل' },
  { key: 'featured', label: 'تحاليل مميزة' },
  { key: 'branches', label: 'الفروع' },
  { key: 'prep', label: 'شروط التحضير' },
  { key: 'about', label: 'من نحن' },
]

export default function AdminDashboard() {
  const { session, signOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('packages')

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoWhiteFull} alt="Trust Labs" />
          <span>لوحة التحكم</span>
        </div>
        <div className="admin-header__user">
          <span>{session?.user?.email}</span>
          <button onClick={signOut}>تسجيل الخروج</button>
        </div>
      </header>

      <nav className="admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`admin-tabs__btn${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {activeTab === 'packages' && <PackagesTab />}
        {activeTab === 'tests' && <TestsTab />}
        {activeTab === 'featured' && <FeaturedTestsTab />}
        {activeTab === 'branches' && <BranchesTab />}
        {activeTab === 'prep' && <PrepTab />}
        {activeTab === 'about' && <AboutTab />}
      </main>
    </div>
  )
}
