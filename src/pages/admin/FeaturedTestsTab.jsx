import { useEffect, useState } from 'react'
import { adminListFeaturedTests, adminSaveFeaturedTest, adminDeleteFeaturedTest } from '../../lib/admin'
import ImageUploadField from '../../components/admin/ImageUploadField'

const emptyItem = { name: '', price: 0, highlight: '', image_url: null, sort_order: 0 }

export default function FeaturedTestsTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListFeaturedTests()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSaveFeaturedTest({ ...editing, price: Number(editing.price), sort_order: Number(editing.sort_order) })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح التحليل المميز ده؟')) return
    try {
      await adminDeleteFeaturedTest(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>تحاليل مميزة ({rows.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyItem })}>
          + تحليل مميز جديد
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editing.id ? 'تعديل تحليل مميز' : 'تحليل مميز جديد'}</h3>

          <ImageUploadField
            label="صورة الكارت"
            folder="featured-tests"
            value={editing.image_url}
            onChange={(url) => setEditing({ ...editing, image_url: url })}
          />

          <div className="admin-form__row">
            <label>
              <span>الاسم</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <label>
              <span>السعر (جنيه)</span>
              <input
                required
                type="number"
                value={editing.price}
                onChange={(e) => setEditing({ ...editing, price: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-form__row">
            <label>
              <span>وصف تسويقي قصير</span>
              <input
                value={editing.highlight || ''}
                onChange={(e) => setEditing({ ...editing, highlight: e.target.value })}
              />
            </label>
            <label>
              <span>ترتيب الظهور</span>
              <input
                type="number"
                value={editing.sort_order}
                onChange={(e) => setEditing({ ...editing, sort_order: e.target.value })}
              />
            </label>
          </div>
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

      {loading ? (
        <p className="admin-loading">جاري التحميل...</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>السعر</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  {t.image_url ? (
                    <img className="admin-image-upload__preview" src={t.image_url} alt="" />
                  ) : (
                    <span className="admin-image-upload__placeholder">مفيش صورة</span>
                  )}
                </td>
                <td>{t.name}</td>
                <td>{t.price.toLocaleString('en-US')} جنيه</td>
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm" onClick={() => setEditing(t)}>
                    تعديل
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(t.id)}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
