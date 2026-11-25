import { useEffect, useState } from 'react'
import { adminListBookings, adminUpdateBookingStatus } from '../../lib/admin'
import { listAvailableChemists } from '../../lib/chemistApi'
import ChemistAssign from './ChemistAssign'
import PhoneBookingForm from './PhoneBookingForm'

const STATUSES = ['جديد', 'تم التأكيد', 'تم السحب', 'ملغي']
const MODES = { home: 'زيارة منزلية', branch: 'فرع' }
const SOURCES = { booking_form: 'صفحة الحجز', chat_assistant: 'المساعد الذكي', call_center: 'الكول سنتر' }
const PAYMENT_STATUSES = {
  pending: 'بانتظار الدفع',
  paid: 'تم الدفع ✅',
  failed: 'فشل الدفع',
  refunded: 'تم الاسترداد',
  voided: 'تم الإلغاء',
}

// A GPS fix wins over a pasted link; the link is already validated as https maps.
function bookingMapsUrl(b) {
  if (b.location_lat != null && b.location_lng != null) {
    return `https://www.google.com/maps?q=${b.location_lat},${b.location_lng}`
  }
  return b.location_link || null
}

export default function BookingsTab() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [chemists, setChemists] = useState([])

  const load = () => {
    setLoading(true)
    adminListBookings()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // A failing chemist list must not hide the bookings; the select just stays empty.
    listAvailableChemists()
      .then(setChemists)
      .catch(() => setChemists([]))
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

      <PhoneBookingForm onCreated={load} />

      {error && <p className="admin-error">{error}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>رقم الحجز</th>
            <th>المصدر</th>
            <th>النوع</th>
            <th>الاسم</th>
            <th>الموبايل</th>
            <th>تاريخ الميلاد</th>
            <th>العنوان / الفرع</th>
            <th>الميعاد</th>
            <th>التحاليل</th>
            <th>الدفع</th>
            <th>التأمين / النادي</th>
            <th>ملاحظات</th>
            <th>التاريخ</th>
            <th>وصل لـ Trust Lab Ops؟</th>
            <th>الحالة</th>
            <th>الكيميائي</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i) => (
            <tr key={i.id}>
              <td dir="ltr">{i.booking_ref}</td>
              <td>{SOURCES[i.source] || i.source || '—'}</td>
              <td>{MODES[i.mode] || i.mode}</td>
              <td>{i.name}</td>
              <td dir="ltr">{i.phone}</td>
              <td>{i.dob || '—'}</td>
              <td style={{ maxWidth: 220, whiteSpace: 'pre-wrap' }}>
                {i.mode === 'home' ? i.address : i.branch_name || '—'}
                {i.mode === 'home' && bookingMapsUrl(i) && (
                  <>
                    <br />
                    <a href={bookingMapsUrl(i)} target="_blank" rel="noopener noreferrer">
                      📍 افتح على الخريطة
                      {i.location_accuracy_m != null && ` (±${i.location_accuracy_m} م)`}
                    </a>
                  </>
                )}
              </td>
              <td>{i.preferred_date || '—'}</td>
              <td style={{ maxWidth: 220 }}>{(i.tests || []).join('، ') || '—'}</td>
              <td>
                {i.payment_method || '—'}
                {i.payment_status && <div className="admin-badge">{PAYMENT_STATUSES[i.payment_status] || i.payment_status}</div>}
                {i.launch_offer_applied && <div className="admin-badge">عرض الإطلاق</div>}
              </td>
              <td>
                {i.patient_type && i.patient_type !== 'Normal' ? i.patient_type : '—'}
                {i.card_issuer ? ` (${i.card_issuer})` : ''}
              </td>
              <td style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>{i.notes || '—'}</td>
              <td>{new Date(i.created_at).toLocaleString('ar-EG')}</td>
              <td>{i.synced_to_erp ? '✅' : '⏳'}</td>
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
              <td>
                {i.mode === 'home' && i.status !== 'ملغي' ? (
                  <ChemistAssign booking={i} chemists={chemists} onChanged={load} />
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
