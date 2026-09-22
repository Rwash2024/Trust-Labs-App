import { useEffect, useState } from 'react'
import { adminListVisitRatings } from '../../lib/admin'

const TYPES = { branch: 'فرع', home: 'زيارة منزلية' }

function Stars({ value }) {
  if (!value) return '—'
  return '★'.repeat(value) + '☆'.repeat(5 - value)
}

export default function VisitRatingsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    adminListVisitRatings()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="admin-loading">جاري التحميل...</p>

  const filtered = filter === 'all' ? items : items.filter((i) => i.visit_type === filter)
  const avg = filtered.length ? (filtered.reduce((s, i) => s + i.overall, 0) / filtered.length).toFixed(1) : '—'

  return (
    <div>
      <div className="admin-toolbar">
        <h2>
          قيّم زيارتك ({filtered.length}) — متوسط الرضا: {avg}
        </h2>
        <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">الكل</option>
          <option value="branch">زيارة فرع</option>
          <option value="home">زيارة منزلية</option>
        </select>
      </div>

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>النوع</th>
            <th>التقييم العام</th>
            <th>السرعة / الالتزام بالميعاد</th>
            <th>تعامل الموظفين / الكيميائي</th>
            <th>الاسم</th>
            <th>الموبايل</th>
            <th>اسم الكيميائي</th>
            <th>التعليق</th>
            <th>التاريخ</th>
            <th>وصلت لـ Trust Lab Ops؟</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i) => (
            <tr key={i.id}>
              <td>{TYPES[i.visit_type] || i.visit_type}</td>
              <td>
                <Stars value={i.overall} />
              </td>
              <td>
                <Stars value={i.visit_type === 'home' ? i.punctuality : i.speed} />
              </td>
              <td>
                <Stars value={i.staff} />
              </td>
              <td>{i.name || '—'}</td>
              <td dir="ltr">{i.phone || '—'}</td>
              <td>{i.chemist_name || '—'}</td>
              <td style={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>{i.comment || '—'}</td>
              <td>{new Date(i.created_at).toLocaleString('ar-EG')}</td>
              <td>{i.synced_to_erp ? '✅' : '⏳ لسه'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
