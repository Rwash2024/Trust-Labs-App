import { useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { chemistEmailFromPhone } from '../../lib/chemistTracking'
import brand from '../../brand'

export default function ChemistLogin({ notice, onSubmitStart, onSubmitDone }) {
  const { signIn } = useAdminAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const email = chemistEmailFromPhone(phone)
    if (!email) {
      setPhoneError('اكتب رقم موبايل صحيح، مثلاً 01012345678')
      return
    }
    setPhoneError('')
    if (!password) {
      setError('اكتب كلمة المرور')
      return
    }
    setBusy(true)
    onSubmitStart?.()
    const result = await signIn(email, password)
    if (result.error) setError('الرقم أو كلمة المرور غلط، جرّب تاني')
    await onSubmitDone?.(result)
    setBusy(false)
  }

  return (
    <div className="chemist__body chemist__login">
      <div className="chemist__login-head">
        <h1 className="chemist__title">دخول الكيميائي</h1>
        <p className="chemist__muted">{brand.name}</p>
      </div>

      {notice && (
        <p className="chemist__alert chemist__alert--warn" role="alert">
          <span>{notice}</span>
        </p>
      )}

      <form className="chemist__form" onSubmit={handleSubmit} noValidate>
        <div className="chemist__field">
          <label htmlFor="chemist-phone">رقم الموبايل</label>
          <input
            id="chemist-phone"
            type="tel"
            inputMode="tel"
            autoComplete="username"
            dir="ltr"
            placeholder="01XXXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneError ? 'true' : undefined}
            aria-describedby={phoneError ? 'chemist-phone-error' : undefined}
          />
          {phoneError && (
            <p id="chemist-phone-error" className="chemist__field-error" role="alert">
              {phoneError}
            </p>
          )}
        </div>

        <div className="chemist__field">
          <label htmlFor="chemist-password">كلمة المرور</label>
          <input
            id="chemist-password"
            type="password"
            autoComplete="current-password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'chemist-password-error' : undefined}
          />
          {error && (
            <p id="chemist-password-error" className="chemist__field-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="chemist__btn chemist__btn--primary" disabled={busy}>
          {busy ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
