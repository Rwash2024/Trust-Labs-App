import { useState } from 'react'
import brand from '../../brand'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import logoWhiteFull from '@client/logo-white-full.png'
import './Admin.css'
import './AdminLogin.css'

// Small right-triangle glass tab that sits in a chamfered corner of the card.
function CornerTab({ className }) {
  return (
    <svg className={`admin-login__tab ${className}`} viewBox="0 0 52 52" aria-hidden="true">
      <path d="M9 2.5H37Q44 2.5 39 7.5L7.5 39Q2.5 44 2.5 37V9Q2.5 2.5 9 2.5Z" />
    </svg>
  )
}

const stroke = { fill: 'none', strokeLinecap: 'round' }

export default function AdminLogin() {
  const { session, isAdmin, signIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to={isAdmin ? '/admin' : '/admin/samples'} replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError('بيانات الدخول غير صحيحة، حاول تاني.')
  }

  return (
    <div className="admin-login">
      <svg className="admin-login__scene" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="adminLoginRibbon" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="adminLoginSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="adminLoginDeep" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
        </defs>
        <g className="admin-login__ribbons">
          <path d="M-150 640 C 250 380, 620 820, 980 560 S 1500 300, 1640 420" stroke="#0a3a21" strokeOpacity="0.32" strokeWidth="120" filter="url(#adminLoginDeep)" {...stroke} />
          <path d="M-150 160 C 260 -40, 560 380, 940 210 S 1420 20, 1640 120" stroke="#0a3a21" strokeOpacity="0.26" strokeWidth="90" filter="url(#adminLoginDeep)" {...stroke} />
          <path d="M-120 250 C 260 60, 640 460, 1000 280 S 1480 140, 1620 220" stroke="url(#adminLoginRibbon)" strokeWidth="22" filter="url(#adminLoginSoft)" {...stroke} />
          <path d="M-120 330 C 280 160, 640 540, 1010 370 S 1470 250, 1620 330" stroke="url(#adminLoginRibbon)" strokeOpacity="0.55" strokeWidth="8" {...stroke} />
          <path d="M-140 720 C 220 520, 600 900, 960 690 S 1440 470, 1620 560" stroke="url(#adminLoginRibbon)" strokeWidth="26" filter="url(#adminLoginSoft)" {...stroke} />
          <path d="M-140 800 C 240 620, 610 980, 970 780 S 1430 580, 1620 660" stroke="url(#adminLoginRibbon)" strokeOpacity="0.5" strokeWidth="7" {...stroke} />
        </g>
      </svg>

      <div className="admin-login__frame">
        <CornerTab className="admin-login__tab--tl" />
        <CornerTab className="admin-login__tab--br" />

        <form className="admin-login__card" onSubmit={handleSubmit}>
          <img className="admin-login__logo" src={logoWhiteFull} alt={brand.name} />
          <h1 className="admin-login__title">
            لوحة تحكم <em>{brand.name}</em>
          </h1>
          <p className="admin-login__subtitle">تسجيل دخول فريق الإدارة فقط</p>

          <label className="admin-login__field">
            <span>البريد الإلكتروني</span>
            <span className="admin-login__input">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...stroke} aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M4 8l8 6 8-6" />
              </svg>
              <input required type="email" autoComplete="username" dir="ltr" placeholder="name@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </span>
          </label>

          <label className="admin-login__field">
            <span>كلمة المرور</span>
            <span className="admin-login__input">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...stroke} aria-hidden="true">
                <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
                <path d="M8 10.5V8a4 4 0 018 0v2.5" />
              </svg>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="admin-login__eye"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...stroke} aria-hidden="true">
                  <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="M4 4l16 16" />}
                </svg>
              </button>
            </span>
          </label>

          {error && <p className="admin-login__error">{error}</p>}

          <button className="admin-login__submit" type="submit" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            {!loading && (
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" {...stroke} aria-hidden="true">
                <path d="M20 12H4M10 6l-6 6 6 6" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
