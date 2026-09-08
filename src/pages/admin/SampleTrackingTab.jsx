import { useEffect, useState } from 'react'
import { adminListSamples, adminCreateSample, adminUpdateSampleStatus } from '../../lib/admin'

const STATUSES = [
  'تم تسجيل الطلب',
  'جاري السحب',
  'تم سحب العينة',
  'في المعمل - جاري التحليل',
  'جاهزة النتيجة',
  'تم التسليم',
]

const emptyItem = { booking_ref: '', patient_name: '', phone: '', branch_name: '' }

export default function SampleTrackingTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListSamples()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminCreateSample(adding)
      setAdding(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (id, status) => {
    setError('')
    try {
      await adminUpdateSampleStatus(id, status)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>تتبع العينات ({items.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setAdding({ ...emptyItem })}>
          + عينة جديدة
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {adding && (
        <form className="admin-form" onSubmit={handleCreate}>
          <h3>عينة جديدة</h3>
          <label>
            <span>اسم المريض</span>
            <input
              required
              value={adding.patient_name}
              onChange={(e) => setAdding({ ...adding, patient_name: e.target.value })}
            />
          </label>
          <label>
            <span>رقم موبايل المريض (ده اللي هيتابع بيه)</span>
            <input
              required
              dir="ltr"
              type="tel"
              value={adding.phone}
              onChange={(e) => setAdding({ ...adding, phone: e.target.value })}
            />
          </label>
          <label>
            <span>رقم الحجز (اختياري، لو متوفر من الإيميل اللي بيوصل من الحجز)</span>
            <input
              dir="ltr"
              value={adding.booking_ref}
              onChange={(e) => setAdding({ ...adding, booking_ref: e.target.value })}
            />
          </label>
          <label>
            <span>الفرع (اختياري)</span>
            <input
              value={adding.branch_name}
              onChange={(e) => setAdding({ ...adding, branch_name: e.target.value })}
            />
          </label>
          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={() => setAdding(null)}>
              إلغاء
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>المريض</th>
            <th>الموبايل</th>
            <th>رقم الحجز</th>
            <th>الفرع</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.patient_name}</td>
              <td dir="ltr">{i.phone}</td>
              <td dir="ltr">{i.booking_ref || '—'}</td>
              <td>{i.branch_name || '—'}</td>
              <td>
                <select
                  className="admin-select"
                  value={i.status}
                  onChange={(e) => handleStatusChange(i.id, e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
