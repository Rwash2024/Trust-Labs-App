import { useState } from 'react'
import brand from '../../brand'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { AdminRail, AdminTopbar } from './AdminRail'
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

  return (
    <div className="admin-dashboard admin-dashboard--rail">
      <AdminRail tabs={railTabs} moreTabs={moreTabs} activeTab={activeTab} onPick={setActiveTab} onSignOut={signOut} />
      <AdminTopbar email={session?.user?.email} />

      <main className="admin-content" key={activeTab}>
        {activeTab === 'overview' && <OverviewTab onNavigate={setActiveTab} />}
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
