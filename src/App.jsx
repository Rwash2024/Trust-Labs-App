import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import BottomNav from './components/BottomNav'
import ChatWidget from './components/ChatWidget'
import RouteTracker from './components/RouteTracker'
import Splash from './components/Splash'
import { AdminAuthProvider } from './context/AdminAuthContext'
import AdminProtectedRoute from './pages/admin/AdminProtectedRoute'
import Home from './pages/Home'
import Packages from './pages/Packages'
import About from './pages/About'
import Branches from './pages/Branches'
import Booking from './pages/Booking'
import Contact from './pages/Contact'
import TrustCard from './pages/TrustCard'
import Results from './pages/Results'
import PrepInstructions from './pages/PrepInstructions'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import TrackSample from './pages/TrackSample'
import News from './pages/News'
import Complaints from './pages/Complaints'
import International from './pages/International'
import InternationalBranches from './pages/InternationalBranches'
import InternationalBooking from './pages/InternationalBooking'
import InternationalAbout from './pages/InternationalAbout'
import InternationalContact from './pages/InternationalContact'
import InternationalResults from './pages/InternationalResults'
import InternationalTrustCard from './pages/InternationalTrustCard'
import InternationalTrackSample from './pages/InternationalTrackSample'
import InternationalNews from './pages/InternationalNews'
import InternationalPrepInstructions from './pages/InternationalPrepInstructions'
import OfferCounter from './pages/OfferCounter'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import BranchSamplesDashboard from './pages/admin/BranchSamplesDashboard'

function PatientApp() {
  return (
    <>
      <span className="app-blob app-blob--1" aria-hidden="true" />
      <span className="app-blob app-blob--2" aria-hidden="true" />
      <main style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/about" element={<About />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/trust-card" element={<TrustCard />} />
          <Route path="/results" element={<Results />} />
          <Route path="/prep-instructions" element={<PrepInstructions />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/track-sample" element={<TrackSample />} />
          <Route path="/news" element={<News />} />
          <Route path="/complaints" element={<Complaints />} />
        </Routes>
      </main>
      <BottomNav />
      <ChatWidget />
    </>
  )
}

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const isKiosk = location.pathname === '/offer-counter'
  const isInternational = location.pathname.startsWith('/international')
  const [showSplash, setShowSplash] = useState(!isAdmin && !isKiosk && !isInternational)

  return (
    <AdminAuthProvider>
      <RouteTracker />
      {showSplash && !isAdmin && !isKiosk && !isInternational && <Splash onFinish={() => setShowSplash(false)} />}
      {isKiosk ? (
        <OfferCounter />
      ) : isInternational ? (
        <Routes>
          <Route path="/international" element={<International />} />
          <Route path="/international/branches" element={<InternationalBranches />} />
          <Route path="/international/booking" element={<InternationalBooking />} />
          <Route path="/international/about" element={<InternationalAbout />} />
          <Route path="/international/contact" element={<InternationalContact />} />
          <Route path="/international/results" element={<InternationalResults />} />
          <Route path="/international/trust-card" element={<InternationalTrustCard />} />
          <Route path="/international/track-sample" element={<InternationalTrackSample />} />
          <Route path="/international/news" element={<InternationalNews />} />
          <Route path="/international/prep-instructions" element={<InternationalPrepInstructions />} />
        </Routes>
      ) : isAdmin ? (
        <div className="admin-app">
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute requireAdmin>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/samples"
              element={
                <AdminProtectedRoute>
                  <BranchSamplesDashboard />
                </AdminProtectedRoute>
              }
            />
          </Routes>
        </div>
      ) : (
        <PatientApp />
      )}
      <Analytics />
    </AdminAuthProvider>
  )
}
