import { useEffect, useState } from 'react'
import { adminListBranches, adminSaveBranch, adminDeleteBranch } from '../../lib/admin'

const emptyBranch = { governorate: '', name: '', address: '', phone: '', hours: '8ص - 11م', maps_url: '', sort_order: 0 }

export default function BranchesTab() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListBranches()
      .then(setBranches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSaveBranch({ ...editing, sort_order: Number(editing.sort_order) || 0 })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح الفرع ده؟')) return
    try {
      await adminDeleteBranch(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>الفروع ({branches.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyBranch, sort_order: branches.length })}>
          + فرع جديد
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editing.id ? 'تعديل فرع' : 'فرع جديد'}</h3>
          <div className="admin-form__row">
            <label>
              <span>المحافظة</span>
              <input required value={editing.governorate} onChange={(e) => setEditing({ ...editing, governorate: e.target.value })} />
            </label>
            <label>
              <span>اسم الفرع</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
          </div>
          <label>
            <span>العنوان</span>
            <textarea rows={2} required value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          </label>
          <div className="admin-form__row">
            <label>
              <span>التليفون</span>
              <input required value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
            </label>
            <label>
              <span>المواعيد</span>
              <input required value={editing.hours} onChange={(e) => setEditing({ ...editing, hours: e.target.value })} />
            </label>
          </div>
          <label>
            <span>لينك اللوكيشن (Google Maps) — اختياري</span>
            <input
              dir="ltr"
              placeholder="https://maps.app.goo.gl/..."
              value={editing.maps_url || ''}
              onChange={(e) => setEditing({ ...editing, maps_url: e.target.value })}
            />
            <small className="admin-form__hint">
              افتح الفرع على خرائط جوجل، اضغط "مشاركة"، وانسخ اللينك هنا. لو سبته فاضي، هيتولّد لينك بحث تلقائي من اسم وعنوان الفرع.
            </small>
          </label>
          <div className="admin-form__actions">
            <button type="button" className="admin-btn" onClick={() => setEditing(null)}>
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
            <th>المحافظة</th>
            <th>الفرع</th>
            <th>التليفون</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td>{b.governorate}</td>
              <td>{b.name}</td>
              <td dir="ltr" style={{ textAlign: 'right' }}>{b.phone}</td>
              <td className="admin-table__actions">
                <button className="admin-btn admin-btn--sm" onClick={() => setEditing(b)}>
                  تعديل
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(b.id)}>
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
