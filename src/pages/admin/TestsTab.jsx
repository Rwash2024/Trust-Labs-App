import { useEffect, useState } from 'react'
import { adminListTests, adminSaveTest, adminDeleteTest } from '../../lib/admin'

const PAGE_SIZE = 50
const emptyTest = { code: '', name: '', price: 0, popular: false }

export default function TestsTab() {
  const [rows, setRows] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    adminListTests({ search, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then(({ rows, count }) => {
        setRows(rows)
        setCount(count)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [page, search])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adminSaveTest({ ...editing, price: Number(editing.price) })
      setEditing(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (code) => {
    if (!confirm('متأكد إنك عايز تمسح التحليل ده؟')) return
    try {
      await adminDeleteTest(code)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePopular = async (test) => {
    try {
      await adminSaveTest({ ...test, popular: !test.popular })
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div>
      <div className="admin-toolbar">
        <h2>التحاليل ({count.toLocaleString('en-US')})</h2>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing({ ...emptyTest })}>
          + تحليل جديد
        </button>
      </div>

      <input
        className="admin-search"
        type="text"
        placeholder="ابحث عن تحليل بالاسم..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
      />

      {error && <p className="admin-error">{error}</p>}

      {editing && (
        <form className="admin-form" onSubmit={handleSave}>
          <h3>{rows.some((r) => r.code === editing.code) ? 'تعديل تحليل' : 'تحليل جديد'}</h3>
          <div className="admin-form__row">
            <label>
              <span>الكود</span>
              <input
                required
                disabled={rows.some((r) => r.code === editing.code)}
                value={editing.code}
                onChange={(e) => setEditing({ ...editing, code: e.target.value })}
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
            <label className="admin-form__checkbox">
              <input
                type="checkbox"
                checked={editing.popular}
                onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
              />
              <span>أكثر طلبًا (تظهر في شاشة الباقات)</span>
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
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>السعر</th>
                <th>أكثر طلبًا</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.code}>
                  <td>{t.name}</td>
                  <td>{t.price.toLocaleString('en-US')} جنيه</td>
                  <td>
                    <input type="checkbox" checked={t.popular} onChange={() => togglePopular(t)} />
                  </td>
                  <td className="admin-table__actions">
                    <button className="admin-btn admin-btn--sm" onClick={() => setEditing(t)}>
                      تعديل
                    </button>
                    <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(t.code)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="admin-pagination">
            <button className="admin-btn admin-btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              السابق
            </button>
            <span>
              صفحة {page + 1} من {totalPages}
            </span>
            <button
              className="admin-btn admin-btn--sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </button>
          </div>
        </>
      )}
    </div>
  )
}
