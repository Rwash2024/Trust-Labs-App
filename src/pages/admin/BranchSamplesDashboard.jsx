import { useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import SampleTrackingTab from './SampleTrackingTab'
import ComplaintsTab from './ComplaintsTab'
import logoWhiteFull from '../../assets/logo-white-full.png'
import './Admin.css'

export default function BranchSamplesDashboard() {
  const { session, signOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('samples')

  // Customer-service / branch account: samples plus complaints (read and
  // change status only — deleting a complaint is admin-only, enforced in the
  // database by supabase/complaints_staff_permissions_migration.sql).
  const tabs = [
    { key: 'samples', label: 'تتبع العينات' },
    { key: 'complaints', label: 'شكاوى واقتراحات' },
  ]

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoWhiteFull} alt="Trust Labs" />
          <span>{tabs.find((t) => t.key === activeTab).label}</span>
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
        {activeTab === 'samples' && <SampleTrackingTab />}
        {activeTab === 'complaints' && <ComplaintsTab canDelete={false} />}
      </main>
    </div>
  )
}
