import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import logoWhiteFull from '../../assets/logo-white-full.png'
import './Admin.css'

export default function AdminLogin() {
  const { session, signIn } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/admin" replace />

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
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <img className="admin-login__logo" src={logoWhiteFull} alt="Trust Labs" />
        <h1 className="admin-login__title">لوحة تحكم Trust Labs</h1>
        <p className="admin-login__subtitle">تسجيل دخول فريق الإدارة فقط</p>

        <label className="admin-login__field">
          <span>البريد الإلكتروني</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="admin-login__field">
          <span>كلمة المرور</span>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="admin-login__error">{error}</p>}

        <button className="admin-login__submit" type="submit" disabled={loading}>
          {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  )
}
