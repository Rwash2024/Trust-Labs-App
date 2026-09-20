import { useEffect, useState } from 'react'
import { adminListBookings, adminUpdateBookingStatus } from '../../lib/admin'

const STATUSES = ['جديد', 'تم التأكيد', 'تم السحب', 'ملغي']
const MODES = { home: 'زيارة منزلية', branch: 'فرع' }

export default function BookingsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = () => {
    setLoading(true)
    adminListBookings()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleStatusChange = async (id, status) => {
    setError('')
    try {
      await adminUpdateBookingStatus(id, status)
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
        <h2>الحجوزات ({filtered.length})</h2>
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
            <th>رقم الحجز</th>
            <th>النوع</th>
            <th>الاسم</th>
            <th>الموبايل</th>
            <th>تاريخ الميلاد</th>
            <th>العنوان / الفرع</th>
            <th>الميعاد</th>
            <th>التحاليل</th>
            <th>ملاحظات</th>
            <th>التاريخ</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i) => (
            <tr key={i.id}>
              <td dir="ltr">{i.booking_ref}</td>
              <td>{MODES[i.mode] || i.mode}</td>
              <td>{i.name}</td>
              <td dir="ltr">{i.phone}</td>
              <td>{i.dob || '—'}</td>
              <td style={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>
                {i.mode === 'home' ? i.address : i.branch_name || '—'}
              </td>
              <td>{i.preferred_date || '—'}</td>
              <td style={{ maxWidth: 220 }}>{(i.tests || []).join('، ') || '—'}</td>
              <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{i.notes || '—'}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
