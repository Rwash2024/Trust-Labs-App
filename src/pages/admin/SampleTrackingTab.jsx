import { useEffect, useState } from 'react'
import {
  adminListSamples,
  adminCreateSample,
  adminUpdateSample,
  adminUpdateSampleStatus,
  adminDeleteSample,
} from '../../lib/admin'
import { fetchBranchGroups } from '../../lib/data'

const STATUSES = [
  'تم تسجيل الطلب',
  'جاري السحب',
  'تم سحب العينة',
  'في المعمل - جاري التحليل',
  'جاهزة النتيجة',
  'تم التسليم',
]

const emptyItem = { booking_ref: '', patient_name: '', phone: '', branch_name: '' }

function SampleForm({ title, value, branches, saving, onChange, onCancel, onSubmit }) {
  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <h3>{title}</h3>
      <label>
        <span>اسم المريض</span>
        <input required value={value.patient_name} onChange={(e) => onChange({ ...value, patient_name: e.target.value })} />
      </label>
      <label>
        <span>رقم موبايل المريض (ده اللي هيتابع بيه)</span>
        <input
          required
          dir="ltr"
          type="tel"
          inputMode="numeric"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
        />
      </label>
      <label>
        <span>رقم الحجز (اختياري، لو متوفر من الإيميل اللي بيوصل من الحجز)</span>
        <input
          dir="ltr"
          inputMode="numeric"
          value={value.booking_ref}
          onChange={(e) => onChange({ ...value, booking_ref: e.target.value.replace(/\D/g, '') })}
        />
      </label>
      <label>
        <span>الفرع</span>
        <select required value={value.branch_name} onChange={(e) => onChange({ ...value, branch_name: e.target.value })}>
          <option value="" disabled>
            اختار الفرع
          </option>
          {branches.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="admin-form__actions">
        <button type="button" className="admin-btn" onClick={onCancel}>
          إلغاء
        </button>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  )
}

export default function SampleTrackingTab({ canManage = false }) {
  const [items, setItems] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)
  const [editing, setEditing] = useState(null)
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

  useEffect(() => {
    fetchBranchGroups().then((groups) => {
      setBranches(groups.flatMap((g) => g.list.map((b) => b.name)))
    })
  }, [])

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

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminUpdateSample(editing.id, editing)
      setEditing(null)
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

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح السجل ده؟')) return
    setError('')
    try {
      await adminDeleteSample(id)
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
        <SampleForm
          title="عينة جديدة"
          value={adding}
          branches={branches}
          saving={saving}
          onChange={setAdding}
          onCancel={() => setAdding(null)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <SampleForm
          title="تعديل بيانات العينة"
          value={editing}
          branches={branches}
          saving={saving}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
        />
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>المريض</th>
            <th>الموبايل</th>
            <th>رقم الحجز</th>
            <th>الفرع</th>
            <th>وقت التسجيل</th>
            <th>الحالة</th>
            {canManage && <th></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.patient_name}</td>
              <td dir="ltr">{i.phone}</td>
              <td dir="ltr">{i.booking_ref || '—'}</td>
              <td>{i.branch_name || '—'}</td>
              <td>{new Date(i.created_at).toLocaleString('ar-EG')}</td>
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
              {canManage && (
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm" onClick={() => setEditing(i)}>
                    تعديل
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(i.id)}>
                    حذف
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
