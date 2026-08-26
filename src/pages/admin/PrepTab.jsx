import { useEffect, useState } from 'react'
import { adminListPrepInstructions, adminSavePrepInstruction, adminDeletePrepInstruction } from '../../lib/admin'

const emptyItem = { test_name: '', instruction: '' }

export default function PrepTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListPrepInstructions()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSavePrepInstruction(editing)
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (testName) => {
    if (!confirm('متأكد إنك عايز تمسح الشرط ده؟')) return
    try {
      await adminDeletePrepInstruction(testName)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  return (
    <div>
      <div className="admin-toolbar">
        <h2>شروط تحضير التحاليل ({items.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyItem })}>
          + شرط جديد
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{items.some((i) => i.test_name === editing.test_name) ? 'تعديل شرط' : 'شرط جديد'}</h3>
          <label>
            <span>اسم التحليل (بالظبط زي ما هو مكتوب في الباقة/التحليل)</span>
            <input
              required
              disabled={items.some((i) => i.test_name === editing.test_name)}
              value={editing.test_name}
              onChange={(e) => setEditing({ ...editing, test_name: e.target.value })}
            />
          </label>
          <label>
            <span>نص الشرط</span>
            <textarea
              required
              rows={4}
              value={editing.instruction}
              onChange={(e) => setEditing({ ...editing, instruction: e.target.value })}
            />
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
            <th>التحليل</th>
            <th>الشرط</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.test_name}>
              <td>{i.test_name}</td>
              <td className="admin-table__wrap">{i.instruction}</td>
              <td className="admin-table__actions">
                <button className="admin-btn admin-btn--sm" onClick={() => setEditing(i)}>
                  تعديل
                </button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(i.test_name)}>
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
