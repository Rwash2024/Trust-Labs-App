import { useState } from 'react'
import { buildManagementReport } from '../../lib/reports'

// yyyy-mm-dd in local time (toISOString would shift the day in Cairo).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function presetRange(key) {
  const now = new Date()
  if (key === 'this-month') return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)]
  if (key === 'last-month')
    return [ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)), ymd(new Date(now.getFullYear(), now.getMonth(), 0))]
  if (key === 'last-3-months') return [ymd(new Date(now.getFullYear(), now.getMonth() - 2, 1)), ymd(now)]
  return [ymd(new Date(now.getFullYear(), 0, 1)), ymd(now)]
}

const PRESETS = [
  { key: 'this-month', label: 'الشهر ده' },
  { key: 'last-month', label: 'الشهر اللي فات' },
  { key: 'last-3-months', label: 'آخر 3 شهور' },
  { key: 'this-year', label: 'من أول السنة' },
]

export default function ReportsTab() {
  const [[fromDate, toDate], setRange] = useState(() => presetRange('this-month'))
  const [fullPhones, setFullPhones] = useState(false)
  const [status, setStatus] = useState('idle') // idle | building | done | error
  const [error, setError] = useState('')
  const [counts, setCounts] = useState(null)

  const handleBuild = async (e) => {
    e.preventDefault()
    if (fromDate > toDate) {
      setError('تاريخ البداية لازم يكون قبل تاريخ النهاية')
      setStatus('error')
      return
    }
    setStatus('building')
    setError('')
    try {
      setCounts(await buildManagementReport({ fromDate, toDate, fullPhones }))
      setStatus('done')
    } catch (err) {
      console.error('report failed', err)
      setError(err.message || 'حصل خطأ وإحنا بنطلّع التقرير')
      setStatus('error')
    }
  }

  return (
    <div>
      <div className="admin-toolbar">
        <h2>تقرير للإدارة</h2>
      </div>

      <form className="admin-form" onSubmit={handleBuild}>
        <p className="admin-form__hint">
          ملف إكسيل واحد فيه: ملخص للاجتماع، والتحاليل الأكثر طلبًا واللي ما اتطلبتش، وتفاصيل كارت الثقة والعينات والحجوزات
          والشكاوى والتقييمات — كل اللي اتسجل في الفترة اللي تختارها.
        </p>

        <div className="admin-form__row">
          {PRESETS.map((p) => (
            <button key={p.key} type="button" className="admin-btn admin-btn--sm" onClick={() => setRange(presetRange(p.key))}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="admin-form__row">
          <label>
            <span>من</span>
            <input type="date" required value={fromDate} onChange={(e) => setRange([e.target.value, toDate])} />
          </label>
          <label>
            <span>إلى</span>
            <input type="date" required value={toDate} onChange={(e) => setRange([fromDate, e.target.value])} />
          </label>
        </div>

        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={fullPhones} onChange={(e) => setFullPhones(e.target.checked)} style={{ width: 'auto' }} />
          <span>أظهر أرقام الموبايل كاملة (من غير الاختيار ده بتظهر كده: 010****7361)</span>
        </label>
        {fullPhones && (
          <p className="admin-error">
            الملف هيبقى فيه أرقام العملاء كاملة — ما تبعتهوش على واتساب أو إيميل مفتوح، وامسحه بعد ما تخلص منه.
          </p>
        )}

        {status === 'error' && <p className="admin-error">{error}</p>}
        {status === 'done' && counts && (
          <p className="admin-success">
            التقرير نزل ✅ — {counts.cards} طلب كارت، {counts.samples} عينة، {counts.bookings} حجز، {counts.complaints} شكوى،{' '}
            {counts.ratings} تقييم، {counts.scans} مسح كود
          </p>
        )}

        <div className="admin-form__actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={status === 'building'}>
            {status === 'building' ? 'جاري تجهيز التقرير...' : '📊 نزّل التقرير (Excel)'}
          </button>
        </div>
      </form>
    </div>
  )
}
