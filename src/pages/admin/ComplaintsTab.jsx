import { useEffect, useState } from 'react'
import { adminListComplaints, adminUpdateComplaintStatus, adminDeleteComplaint } from '../../lib/admin'

const STATUSES = ['جديد', 'تحت المراجعة', 'تم الحل']

export default function ComplaintsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    adminListComplaints()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleStatusChange = async (id, status) => {
    setError('')
    try {
      await adminUpdateComplaintStatus(id, status)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح السجل ده؟')) return
    setError('')
    try {
      await adminDeleteComplaint(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  return (
    <div>
      <div className="admin-toolbar">
        <h2>شكاوى واقتراحات ({filtered.length})</h2>
        <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الموبايل</th>
            <th>النوع</th>
            <th>الفرع</th>
            <th>التقييم</th>
            <th>الرسالة</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td dir="ltr">{i.phone}</td>
              <td>{i.type}</td>
              <td>{i.branch_name || '—'}</td>
              <td>{i.rating ? '★'.repeat(i.rating) : '—'}</td>
              <td style={{ maxWidth: 260, whiteSpace: 'pre-wrap' }}>{i.message}</td>
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
              <td className="admin-table__actions">
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => handleDelete(i.id)}>
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
