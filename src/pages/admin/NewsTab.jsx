import { useEffect, useState } from 'react'
import { adminListNews, adminSaveNews, adminDeleteNews } from '../../lib/admin'
import ImageUploadField from '../../components/admin/ImageUploadField'

const emptyItem = { title: '', description: '', image_url: null, news_date: '', sort_order: 0 }

export default function NewsTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListNews()
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
      await adminSaveNews({ ...editing, sort_order: Number(editing.sort_order) })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح الخبر ده؟')) return
    try {
      await adminDeleteNews(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>أخبار المعمل ({rows.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyItem })}>
          + خبر جديد
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editing.id ? 'تعديل خبر' : 'خبر جديد'}</h3>

          <ImageUploadField
            label="صورة الخبر"
            folder="news"
            value={editing.image_url}
            onChange={(url) => setEditing({ ...editing, image_url: url })}
          />

          <div className="admin-form__row">
            <label>
              <span>العنوان</span>
              <input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label>
              <span>التاريخ</span>
              <input
                type="date"
                value={editing.news_date || ''}
                onChange={(e) => setEditing({ ...editing, news_date: e.target.value })}
              />
            </label>
          </div>
          <div className="admin-form__row">
            <label>
              <span>الوصف</span>
              <textarea
                rows={3}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
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
              <th>العنوان</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id}>
                <td>
                  {n.image_url ? (
                    <img className="admin-image-upload__preview" src={n.image_url} alt="" />
                  ) : (
                    <span className="admin-image-upload__placeholder">مفيش صورة</span>
                  )}
                </td>
                <td>{n.title}</td>
                <td>{n.news_date || '—'}</td>
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm" onClick={() => setEditing(n)}>
                    تعديل
                  </button>
                  <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(n.id)}>
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
