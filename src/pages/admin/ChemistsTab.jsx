import { useCallback, useEffect, useRef, useState } from 'react'
import { listAvailableChemists, listChemists, manageChemist } from '../../lib/chemistApi'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../../lib/phone'

const MIN_PASSWORD = 8
const EMPTY_FORM = { name: '', phone: '', password: '' }

function passwordError(value) {
  if (!value) return 'اكتب الباسورد'
  if (value.length < MIN_PASSWORD) return `الباسورد لازم يكون ${MIN_PASSWORD} حروف أو أرقام على الأقل`
  return ''
}

function PasswordInput({ id, value, onChange, invalid, describedBy }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="chemists-tab__password">
      <input
        id={id}
        type={shown ? 'text' : 'password'}
        dir="ltr"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      />
      <button type="button" className="admin-btn chemists-tab__btn" onClick={() => setShown((s) => !s)} aria-pressed={shown}>
        {shown ? 'إخفاء' : 'إظهار'}
      </button>
    </div>
  )
}

export default function ChemistsTab() {
  const [chemists, setChemists] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rowBusy, setRowBusy] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [creating, setCreating] = useState(false)

  const [resetFor, setResetFor] = useState(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const reqId = useRef(0)

  // Only the first load shows the loading state; later reloads are silent.
  const load = useCallback(() => {
    const id = ++reqId.current
    // Today's counts are a bonus; a failure must not hide the table.
    Promise.all([listChemists(), listAvailableChemists().catch(() => null)])
      .then(([list, available]) => {
        if (id !== reqId.current) return
        setChemists(list)
        setCounts(available ? Object.fromEntries(available.map((c) => [c.id, c.today_count ?? 0])) : {})
        setError('')
      })
      .catch((e) => {
        if (id === reqId.current) setError(e.message)
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false)
      })
  }, [])

  useEffect(() => {
    const reqRef = reqId
    load()
    return () => {
      reqRef.current++
    }
  }, [load])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const validate = (f) => {
    const found = {}
    const name = f.name.trim()
    if (name.length < 2 || name.length > 60) found.name = 'الاسم لازم يكون من 2 لـ 60 حرف'
    const phone = egyptPhoneError(f.phone)
    if (phone) found.phone = phone
    const pw = passwordError(f.password)
    if (pw) found.password = pw
    return found
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setNotice('')
    setError('')
    const found = validate(form)
    setErrors(found)
    const firstBad = Object.keys(found)[0]
    if (firstBad) {
      document.getElementById(`ch-${firstBad}`)?.focus()
      return
    }
    setCreating(true)
    const body = { action: 'create', name: form.name.trim(), phone: cleanEgyptPhoneInput(form.phone), password: form.password }
    // The password never stays in state after submit, win or lose.
    setForm((f) => ({ ...f, password: '' }))
    try {
      await manageChemist(body)
      setForm(EMPTY_FORM)
      setNotice(`اتضاف الكيميائي ${body.name}`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (c) => {
    const next = !c.active
    if (!next && !window.confirm(`توقف حساب ${c.name}؟ مش هيقدر يدخل ولا يشوف زياراته.`)) return
    setNotice('')
    setError('')
    setRowBusy(c.id)
    try {
      await manageChemist({ action: 'set_active', chemist_id: c.id, active: next })
      setNotice(next ? `اتفعّل حساب ${c.name}` : `اتوقف حساب ${c.name}`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRowBusy('')
    }
  }

  const openReset = (c) => {
    setResetFor(c.id)
    setResetPassword('')
    setResetError('')
    setNotice('')
  }

  const closeReset = () => {
    setResetFor(null)
    setResetPassword('')
    setResetError('')
  }

  const handleReset = async (e, c) => {
    e.preventDefault()
    const pw = passwordError(resetPassword)
    if (pw) {
      setResetError(pw)
      return
    }
    const password = resetPassword
    setResetPassword('')
    setResetError('')
    setRowBusy(c.id)
    try {
      await manageChemist({ action: 'reset_password', chemist_id: c.id, password })
      setResetFor(null)
      setNotice(`اتغيّر الباسورد بتاع ${c.name}`)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setRowBusy('')
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div className="chemists-tab">
      <div className="admin-toolbar">
        <h2>الكيميائيين ({chemists.length})</h2>
        {!formOpen && (
          <button type="button" className="admin-btn admin-btn--primary chemists-tab__btn" onClick={() => setFormOpen(true)}>
            + كيميائي جديد
          </button>
        )}
      </div>

      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {formOpen && (
        <form className="admin-form chemists-tab__form" onSubmit={handleCreate} noValidate>
          <h3>كيميائي جديد</h3>
          <div className="chemists-tab__field">
            <label htmlFor="ch-name">الاسم</label>
            <input
              id="ch-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={60}
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'ch-name-err' : undefined}
            />
            {errors.name && (
              <span id="ch-name-err" className="chemists-tab__error" role="alert">
                {errors.name}
              </span>
            )}
          </div>
          <div className="chemists-tab__field">
            <label htmlFor="ch-phone">رقم الموبايل (بيستخدمه في الدخول)</label>
            <input
              id="ch-phone"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              value={form.phone}
              onChange={(e) => set('phone', cleanEgyptPhoneInput(e.target.value))}
              autoComplete="off"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'ch-phone-err' : undefined}
            />
            {errors.phone && (
              <span id="ch-phone-err" className="chemists-tab__error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>
          <div className="chemists-tab__field">
            <label htmlFor="ch-password">الباسورد</label>
            <PasswordInput
              id="ch-password"
              value={form.password}
              onChange={(v) => set('password', v)}
              invalid={!!errors.password}
              describedBy={errors.password ? 'ch-password-err' : 'ch-password-hint'}
            />
            <span id="ch-password-hint" className="admin-form__hint">
              {MIN_PASSWORD} حروف أو أرقام على الأقل
            </span>
            {errors.password && (
              <span id="ch-password-err" className="chemists-tab__error" role="alert">
                {errors.password}
              </span>
            )}
          </div>
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary chemists-tab__btn" disabled={creating}>
              {creating ? 'جاري الحفظ...' : 'ضيف الكيميائي'}
            </button>
            <button
              type="button"
              className="admin-btn chemists-tab__btn"
              disabled={creating}
              onClick={() => {
                setFormOpen(false)
                setForm(EMPTY_FORM)
                setErrors({})
              }}
            >
              إغلاق
            </button>
          </div>
        </form>
      )}

      {chemists.length === 0 ? (
        <p className="live-board__empty">لسه مفيش كيميائيين</p>
      ) : (
        <div className="chemists-tab__scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الموبايل</th>
                <th>الحالة</th>
                <th>زيارات النهارده</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {chemists.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td dir="ltr" style={{ textAlign: 'right' }}>
                    {c.phone}
                  </td>
                  <td>
                    <span className={`trip-badge ${c.active ? 'trip-badge--done' : 'trip-badge--idle'}`}>
                      {c.active ? 'شغّال' : 'موقوف'}
                    </span>
                  </td>
                  <td>{c.active ? (counts[c.id] ?? 0) : '—'}</td>
                  <td>
                    {resetFor === c.id ? (
                      <form className="chemists-tab__reset" onSubmit={(e) => handleReset(e, c)} noValidate>
                        <label htmlFor={`ch-reset-${c.id}`}>باسورد جديد</label>
                        <PasswordInput
                          id={`ch-reset-${c.id}`}
                          value={resetPassword}
                          onChange={setResetPassword}
                          invalid={!!resetError}
                          describedBy={resetError ? `ch-reset-err-${c.id}` : undefined}
                        />
                        {resetError && (
                          <span id={`ch-reset-err-${c.id}`} className="chemists-tab__error" role="alert">
                            {resetError}
                          </span>
                        )}
                        <div className="admin-table__actions">
                          <button type="submit" className="admin-btn admin-btn--primary chemists-tab__btn" disabled={rowBusy === c.id}>
                            {rowBusy === c.id ? 'جاري الحفظ...' : 'احفظ الباسورد'}
                          </button>
                          <button type="button" className="admin-btn chemists-tab__btn" onClick={closeReset} disabled={rowBusy === c.id}>
                            إلغاء
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="admin-table__actions">
                        <button type="button" className="admin-btn chemists-tab__btn" onClick={() => openReset(c)} disabled={rowBusy === c.id}>
                          غيّر الباسورد
                        </button>
                        <button
                          type="button"
                          className={`admin-btn chemists-tab__btn${c.active ? ' admin-btn--danger' : ''}`}
                          onClick={() => handleToggle(c)}
                          disabled={rowBusy === c.id}
                        >
                          {c.active ? 'إيقاف' : 'تفعيل'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
