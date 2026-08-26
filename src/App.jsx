import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import BottomNav from './components/BottomNav'
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
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'

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
        </Routes>
      </main>
      <BottomNav />
    </>
  )
}

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const [showSplash, setShowSplash] = useState(!isAdmin)

  return (
    <AdminAuthProvider>
      <RouteTracker />
      {showSplash && !isAdmin && <Splash onFinish={() => setShowSplash(false)} />}
      {isAdmin ? (
        <div className="admin-app">
          <Routes>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
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
