import { useCallback, useEffect, useRef, useState } from 'react'
import { chemistPhotoUrl, listAvailableChemists, listChemists, manageChemist } from '../../lib/chemistApi'
import { cleanEgyptPhoneInput, egyptPhoneError } from '../../lib/phone'
import { fileToSquareJpeg } from '../../lib/photoResize'

const MIN_PASSWORD = 8
const EMPTY_FORM = { name: '', phone: '', password: '' }
// photo: { base64, previewUrl } = new pick, 'remove' = clear it, null = unchanged
const NO_PHOTO_CHANGE = null

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

function Avatar({ name, src, size = 40 }) {
  const initial = (name || '').trim().charAt(0) || '؟'
  return (
    <span className="chemists-tab__avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : initial}
    </span>
  )
}

export default function ChemistsTab() {
  const [chemists, setChemists] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rowBusy, setRowBusy] = useState('')

  // formMode: null (closed) | 'create' | 'edit'
  const [formMode, setFormMode] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photo, setPhoto] = useState(NO_PHOTO_CHANGE)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const fileRef = useRef(null)

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

  useEffect(() => {
    if (formMode) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('ch-name')?.focus({ preventScroll: true })
    }
  }, [formMode, editing])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setForm(EMPTY_FORM)
    setPhoto(NO_PHOTO_CHANGE)
    setErrors({})
    setNotice('')
  }

  const openEdit = (c) => {
    setFormMode('edit')
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, password: '' })
    setPhoto(NO_PHOTO_CHANGE)
    setErrors({})
    setNotice('')
    setResetFor(null)
  }

  const closeForm = () => {
    setFormMode(null)
    setEditing(null)
    setForm(EMPTY_FORM)
    setPhoto(NO_PHOTO_CHANGE)
    setErrors({})
  }

  const validate = (f) => {
    const found = {}
    const name = f.name.trim()
    if (name.length < 2 || name.length > 60) found.name = 'الاسم لازم يكون من 2 لـ 60 حرف'
    const phone = egyptPhoneError(f.phone)
    if (phone) found.phone = phone
    if (formMode === 'create') {
      const pw = passwordError(f.password)
      if (pw) found.password = pw
    }
    return found
  }

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setErrors((er) => ({ ...er, photo: undefined }))
    try {
      setPhoto(await fileToSquareJpeg(file))
    } catch (err) {
      setErrors((er) => ({ ...er, photo: err.message }))
    } finally {
      setPhotoBusy(false)
    }
  }

  const handleSave = async (e) => {
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
    setSaving(true)
    const name = form.name.trim()
    const phone = cleanEgyptPhoneInput(form.phone)
    const password = form.password
    // The password never stays in state after submit, win or lose.
    setForm((f) => ({ ...f, password: '' }))
    try {
      if (formMode === 'create') {
        const res = await manageChemist({ action: 'create', name, phone, password })
        let msg = `اتضاف الكيميائي ${name}`
        if (photo && photo !== 'remove' && res?.chemist?.id) {
          try {
            await manageChemist({ action: 'set_photo', chemist_id: res.chemist.id, image: photo.base64 })
          } catch (err) {
            msg += `، بس الصورة ما اترفعتش (${err.message}). جرّب تاني من «تعديل»`
          }
        }
        closeForm()
        setNotice(msg)
      } else {
        const c = editing
        if (name !== c.name || phone !== c.phone) {
          await manageChemist({ action: 'update', chemist_id: c.id, name, phone })
        }
        if (photo === 'remove') {
          await manageChemist({ action: 'remove_photo', chemist_id: c.id })
        } else if (photo) {
          await manageChemist({ action: 'set_photo', chemist_id: c.id, image: photo.base64 })
        }
        closeForm()
        setNotice(phone !== c.phone ? `اتحفظت بيانات ${name}. من دلوقتي بيدخل بالرقم الجديد` : `اتحفظت بيانات ${name}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      load()
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

  const handleDelete = async (c) => {
    const ok = window.confirm(
      `تمسح ${c.name}؟\nمش هيقدر يدخل تاني. لو ليه زيارات قديمة، هتفضل محفوظة باسمه في الحجوزات.`,
    )
    if (!ok) return
    setNotice('')
    setError('')
    setRowBusy(c.id)
    try {
      const res = await manageChemist({ action: 'delete', chemist_id: c.id })
      if (editing?.id === c.id) closeForm()
      setNotice(res?.archived ? `اتمسح ${c.name}، وزياراته القديمة محفوظة` : `اتمسح ${c.name}`)
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

  const currentPhotoUrl = editing?.photo_path ? chemistPhotoUrl(editing.photo_path) : null
  const shownPhoto = photo === 'remove' ? null : photo?.previewUrl ?? currentPhotoUrl
  const isEdit = formMode === 'edit'

  return (
    <div className="chemists-tab">
      <div className="admin-toolbar">
        <h2>الكيميائيين ({chemists.length})</h2>
        {!formMode && (
          <button type="button" className="admin-btn admin-btn--primary chemists-tab__btn" onClick={openCreate}>
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

      {formMode && (
        <form ref={formRef} className="admin-form chemists-tab__form" onSubmit={handleSave} noValidate>
          <h3>{isEdit ? `تعديل بيانات ${editing.name}` : 'كيميائي جديد'}</h3>

          <div className="chemists-tab__photo-field">
            <Avatar name={form.name} src={shownPhoto} size={72} />
            <div className="chemists-tab__photo-actions">
              <span className="chemists-tab__photo-label">الصورة (بتظهر للعميل في صفحة التتبع)</span>
              <div className="admin-table__actions">
                <button
                  type="button"
                  className="admin-btn chemists-tab__btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy || saving}
                  aria-describedby={errors.photo ? 'ch-photo-err' : undefined}
                >
                  {photoBusy ? 'جاري التجهيز...' : shownPhoto ? 'غيّر الصورة' : 'ضيف صورة'}
                </button>
                {shownPhoto && (
                  <button
                    type="button"
                    className="admin-btn chemists-tab__btn"
                    onClick={() => setPhoto(currentPhotoUrl ? 'remove' : NO_PHOTO_CHANGE)}
                    disabled={photoBusy || saving}
                  >
                    شيل الصورة
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhotoPick} />
              {errors.photo && (
                <span id="ch-photo-err" className="chemists-tab__error" role="alert">
                  {errors.photo}
                </span>
              )}
            </div>
          </div>

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
              aria-describedby={errors.phone ? 'ch-phone-err' : isEdit ? 'ch-phone-hint' : undefined}
            />
            {isEdit && (
              <span id="ch-phone-hint" className="admin-form__hint">
                لو غيّرت الرقم، الكيميائي هيدخل بالرقم الجديد بنفس الباسورد
              </span>
            )}
            {errors.phone && (
              <span id="ch-phone-err" className="chemists-tab__error" role="alert">
                {errors.phone}
              </span>
            )}
          </div>
          {!isEdit && (
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
          )}
          <div className="admin-form__actions">
            <button type="submit" className="admin-btn admin-btn--primary chemists-tab__btn" disabled={saving || photoBusy}>
              {saving ? 'جاري الحفظ...' : isEdit ? 'احفظ التعديلات' : 'ضيف الكيميائي'}
            </button>
            <button type="button" className="admin-btn chemists-tab__btn" disabled={saving} onClick={closeForm}>
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
                  <td>
                    <span className="chemists-tab__who">
                      <Avatar name={c.name} src={chemistPhotoUrl(c.photo_path)} />
                      {c.name}
                    </span>
                  </td>
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
                        <button type="button" className="admin-btn chemists-tab__btn" onClick={() => openEdit(c)} disabled={rowBusy === c.id || saving}>
                          تعديل
                        </button>
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
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger chemists-tab__btn"
                          onClick={() => handleDelete(c)}
                          disabled={rowBusy === c.id || saving}
                          aria-label={`مسح ${c.name}`}
                        >
                          مسح
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
