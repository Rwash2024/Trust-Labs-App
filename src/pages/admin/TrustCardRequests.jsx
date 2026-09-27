import { useEffect, useState } from 'react'
import { adminListTrustCardRequests, adminUpdateTrustCardRequestStatus, adminDeleteTrustCardRequest } from '../../lib/admin'

const STATUSES = ['جديد', 'تم التواصل', 'تم التفعيل', 'ملغي']

// Trust Card orders placed from /trust-card. Same shape as ComplaintsTab.
export default function TrustCardRequests() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  // Only the first load shows the spinner; refreshes after a status change are silent.
  const load = () => {
    adminListTrustCardRequests()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleStatusChange = async (id, status) => {
    setError('')
    try {
      await adminUpdateTrustCardRequestStatus(id, status)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('متأكد إنك عايز تمسح الطلب ده؟')) return
    setError('')
    try {
      await adminDeleteTrustCardRequest(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="admin-loading">جاري تحميل الطلبات...</p>

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)
  const newCount = items.filter((i) => i.status === 'جديد').length

  return (
    <div>
      <div className="admin-toolbar">
        <h2>
          طلبات الكارت ({filtered.length}){newCount > 0 && ` — ${newCount} جديد`}
        </h2>
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
            <th>صاحب الكارت</th>
            <th>لمين</th>
            <th>الطالب</th>
            <th>الموبايل</th>
            <th>السعر</th>
            <th>التاريخ</th>
            <th>الحالة</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i) => (
            <tr key={i.id}>
              <td>{i.card_holder_name}</td>
              <td>{i.for_whom === 'other' ? `🎁 هدية (${i.relationship})` : 'لنفسه'}</td>
              <td>{i.for_whom === 'other' ? i.buyer_name : '—'}</td>
              <td dir="ltr">{i.phone}</td>
              <td>{Number(i.price).toLocaleString('ar-EG')} جنيه</td>
              <td>{new Date(i.created_at).toLocaleString('ar-EG')}</td>
              <td>
                <select className="admin-select" value={i.status} onChange={(e) => handleStatusChange(i.id, e.target.value)}>
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
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center' }}>
                مفيش طلبات
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
