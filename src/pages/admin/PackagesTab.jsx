import { useEffect, useState } from 'react'
import { adminListPackages, adminSavePackage, adminDeletePackage } from '../../lib/admin'

const emptyPackage = { id: '', name: '', price: 0, tests: [], sort_order: 0 }

export default function PackagesTab() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // package row being edited, or null
  const [testsInput, setTestsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListPackages()
      .then(setPackages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const startEdit = (pkg) => {
    setEditing(pkg)
    setTestsInput((pkg.tests || []).join(', '))
    setError('')
  }

  const startNew = () => {
    setEditing({ ...emptyPackage, sort_order: packages.length })
    setTestsInput('')
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSavePackage({
        ...editing,
        price: Number(editing.price),
        tests: testsInput.split(',').map((t) => t.trim()).filter(Boolean),
        image_key: editing.image_key || editing.id,
      })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(`متأكد إنك عايز تمسح الباقة "${id}"؟`)) return
    try {
      await adminDeletePackage(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>الباقات ({packages.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={startNew}>
          + باقة جديدة
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{packages.some((p) => p.id === editing.id) ? 'تعديل باقة' : 'باقة جديدة'}</h3>
          <div className="admin-form__row">
            <label>
              <span>المعرّف (id) — إنجليزي، بدون مسافات</span>
              <input
                required
                disabled={packages.some((p) => p.id === editing.id)}
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                placeholder="golden-men"
              />
            </label>
            <label>
              <span>الاسم</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
          </div>
          <div className="admin-form__row">
            <label>
              <span>السعر (جنيه)</span>
              <input
                required
                type="number"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
            </label>
            <label>
              <span>ترتيب العرض</span>
              <input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
              />
            </label>
          </div>
          <label>
            <span>التحاليل المتضمنة (افصل بينهم بفاصلة)</span>
            <textarea rows={3} value={testsInput} onChange={(e) => setTestsInput(e.target.value)} />
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
            <th>الاسم</th>
            <th>السعر</th>
            <th>عدد التحاليل</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.price.toLocaleString('en-US')} جنيه</td>
              <td>{p.tests?.length ?? 0}</td>
              <td className="admin-table__actions">
                <button className="admin-btn admin-btn--sm" onClick={() => startEdit(p)}>
                  تعديل
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(p.id)}>
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
