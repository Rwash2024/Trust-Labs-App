import { useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import brand from '../../brand'
import { AdminRail, AdminTopbar } from './AdminRail'
import SampleTrackingTab from './SampleTrackingTab'
import ComplaintsTab from './ComplaintsTab'
import TrustCardRequests from './TrustCardRequests'
import BookingsTab from './BookingsTab'
import './Admin.css'

export default function BranchSamplesDashboard() {
  const { session, signOut } = useAdminAuth()
  const [activeTab, setActiveTab] = useState('bookings')

  // Customer-service / branch account: bookings (to confirm with the
  // patient), samples, complaints and Trust Card orders — read and change
  // status only. Editing details / deleting is admin-only, enforced in the
  // database by supabase/bookings_staff_guard_migration.sql,
  // complaints_staff_permissions_migration.sql and
  // trust_card_requests_staff_access_migration.sql).
  const tabs = [
    { key: 'bookings', label: 'الحجوزات', icon: 'calendar' },
    { key: 'samples', label: 'تتبع العينات', icon: 'drop' },
    { key: 'complaints', label: 'شكاوى واقتراحات', icon: 'message' },
    { key: 'cards', label: 'طلبات الكارت', icon: 'card' },
  ]

  return (
    <div className="admin-dashboard admin-dashboard--rail">
      <AdminRail tabs={tabs} activeTab={activeTab} onPick={setActiveTab} onSignOut={signOut} />
      <AdminTopbar
        email={session?.user?.email}
        title={`${brand.name} · ${tabs.find((t) => t.key === activeTab).label}`}
      />

      <main className="admin-content" key={activeTab}>
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'samples' && <SampleTrackingTab />}
        {activeTab === 'complaints' && <ComplaintsTab canDelete={false} />}
        {activeTab === 'cards' && <TrustCardRequests canDelete={false} />}
      </main>
    </div>
  )
}
