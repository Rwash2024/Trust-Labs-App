import { useAdminAuth } from '../../context/AdminAuthContext'
import brand from '../../brand'
import SampleTrackingTab from './SampleTrackingTab'
import logoWhiteFull from '@client/logo-white-full.png'
import './Admin.css'

export default function BranchSamplesDashboard() {
  const { session, signOut } = useAdminAuth()

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src={logoWhiteFull} alt={brand.name} />
          <span>تتبع العينات</span>
        </div>
        <div className="admin-header__user">
          <span>{session?.user?.email}</span>
          <button onClick={signOut}>تسجيل الخروج</button>
        </div>
      </header>

      <main className="admin-content">
        <SampleTrackingTab />
      </main>
    </div>
  )
}
