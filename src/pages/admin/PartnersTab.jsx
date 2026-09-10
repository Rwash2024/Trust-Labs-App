import { useEffect, useState } from 'react'
import { adminListPartners, adminSavePartner, adminDeletePartner } from '../../lib/admin'
import ImageUploadField from '../../components/admin/ImageUploadField'

const emptyItem = { name: '', image_url: null, sort_order: 0 }

// Logo chips on the home page are 88x48px boxes (object-fit: contain), so any
// reasonable logo shape fits without cropping — keep the size check loose.
const LOGO_TARGET_WIDTH = 176
const LOGO_TARGET_HEIGHT = 96
const LOGO_RATIO_TOLERANCE = 3
const LOGO_MIN_WIDTH = 60

export default function PartnersTab() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListPartners()
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
      await adminSavePartner({ ...editing, sort_order: Number(editing.sort_order) })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح الشريك ده؟')) return
    try {
      await adminDeletePartner(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>شركاء النجاح ({rows.length})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyItem })}>
          + شريك جديد
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{editing.id ? 'تعديل شريك' : 'شريك جديد'}</h3>

          <ImageUploadField
            label="لوجو الشريك"
            folder="partners"
            value={editing.image_url}
            onChange={(url) => setEditing({ ...editing, image_url: url })}
            targetWidth={LOGO_TARGET_WIDTH}
            targetHeight={LOGO_TARGET_HEIGHT}
            ratioTolerance={LOGO_RATIO_TOLERANCE}
            minWidth={LOGO_MIN_WIDTH}
          />

          <div className="admin-form__row">
            <label>
              <span>اسم الشريك</span>
              <input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
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
              <th>اللوجو</th>
              <th>الاسم</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.image_url ? (
                    <img className="admin-image-upload__preview" src={p.image_url} alt="" />
                  ) : (
                    <span className="admin-image-upload__placeholder">مفيش صورة</span>
                  )}
                </td>
                <td>{p.name}</td>
                <td className="admin-table__actions">
                  <button className="admin-btn admin-btn--sm" onClick={() => setEditing(p)}>
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
      )}
    </div>
  )
}
