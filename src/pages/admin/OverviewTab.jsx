import { useEffect, useMemo, useState } from 'react'
import { adminFetchReportData } from '../../lib/admin'
import Icon from './AdminIcons'

// The last 30 days of everything the admin screens collect, summarised on one page.
const DAYS = 30
const MODES = { home: 'زيارة منزلية', branch: 'فرع' }

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dayKey = (iso) => ymd(new Date(iso))
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
const money = (n) => `${Math.round(n).toLocaleString('ar-EG')} جنيه`
const num = (n) => Number(n).toLocaleString('ar-EG')
const average = (values) => {
  const nums = values.filter((v) => typeof v === 'number')
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'صباح الخير'
  if (h < 18) return 'نهارك سعيد'
  return 'مساء الخير'
}

function Trend({ now, before }) {
  if (!before) return null
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return <em className="ov-trend">زي إمبارح</em>
  return <em className={`ov-trend${pct < 0 ? ' down' : ''}`}>{pct > 0 ? '▲' : '▼'} {Math.abs(pct).toLocaleString('ar-EG')}% عن إمبارح</em>
}

export default function OverviewTab({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    adminFetchReportData(ymd(daysAgo(DAYS - 1)), ymd(new Date()))
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        console.error('overview failed', err)
        if (!cancelled) setError(err.message || 'مقدرناش نحمّل الأرقام')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    if (!data) return null
    const { bookings, complaints, ratings } = data
    const today = ymd(new Date())
    const yesterday = ymd(daysAgo(1))
    const byDay = {}
    bookings.forEach((b) => {
      const k = dayKey(b.created_at)
      byDay[k] = (byDay[k] || 0) + 1
    })

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = daysAgo(6 - i)
      return { label: d.toLocaleDateString('ar-EG', { weekday: 'short' }), count: byDay[ymd(d)] || 0, today: i === 6 }
    })

    const places = {}
    bookings.forEach((b) => {
      const k = b.mode === 'home' ? 'زيارة منزلية' : b.branch_name || 'فرع غير محدد'
      places[k] = (places[k] || 0) + 1
    })
    const topPlaces = Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 4)

    const paid = bookings.filter((b) => b.payment_status === 'paid')
    return {
      today: byDay[today] || 0,
      yesterday: byDay[yesterday] || 0,
      month: bookings.length,
      paidCount: paid.length,
      paidValue: paid.reduce((s, b) => s + Number(b.total || 0), 0),
      rating: average(ratings.map((r) => r.overall)),
      ratingCount: ratings.length,
      newBookings: bookings.filter((b) => b.status === 'جديد').length,
      newComplaints: complaints.filter((c) => c.status === 'جديد').length,
      week,
      weekMax: Math.max(1, ...week.map((w) => w.count)),
      topPlaces,
      placeMax: Math.max(1, ...topPlaces.map((p) => p[1])),
      latest: [...bookings].reverse().slice(0, 6),
    }
  }, [data])

  if (error) return <p className="admin-error">{error}</p>
  if (!stats) return <p className="admin-loading">جاري تحميل الأرقام...</p>

  const attention = [
    stats.newBookings > 0 && { text: `${num(stats.newBookings)} حجز جديد مستني`, to: 'bookings' },
    stats.newComplaints > 0 && { text: `${num(stats.newComplaints)} شكوى جديدة`, to: 'complaints' },
  ].filter(Boolean)

  return (
    <div className="ov">
      <section className="ov-hero">
        <div>
          <h2>{greeting()} 👋</h2>
          <p>{attention.length ? 'فيه حاجات محتاجة منك نظرة النهارده:' : 'مفيش حاجة مستنية، كله تمام النهارده.'}</p>
          {attention.length > 0 && (
            <div className="ov-chips">
              {attention.map((a) => (
                <button key={a.to} className="ov-chip" onClick={() => onNavigate(a.to)}>
                  {a.text}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="ov-hero__btn" onClick={() => onNavigate('bookings')}>
          مراجعة الحجوزات
        </button>
      </section>

      <section className="ov-stats">
        <div className="ov-card ov-stat">
          <div className="ov-stat__t"><span><Icon name="calendar" /></span>حجوزات النهارده</div>
          <strong>{num(stats.today)}</strong>
          <Trend now={stats.today} before={stats.yesterday} />
        </div>
        <div className="ov-card ov-stat">
          <div className="ov-stat__t"><span><Icon name="chart" /></span>حجوزات آخر 30 يوم</div>
          <strong>{num(stats.month)}</strong>
        </div>
        <div className="ov-card ov-stat">
          <div className="ov-stat__t"><span><Icon name="card" /></span>مدفوعة أونلاين</div>
          <strong>{num(stats.paidCount)}</strong>
          <em className="ov-trend">{money(stats.paidValue)}</em>
        </div>
        <div className="ov-card ov-stat">
          <div className="ov-stat__t"><span><Icon name="star" /></span>تقييم الزيارات</div>
          <strong>{stats.rating ?? '—'}</strong>
          <em className="ov-trend">{stats.ratingCount ? `من ${num(stats.ratingCount)} تقييم` : 'مفيش تقييمات'}</em>
        </div>
      </section>

      <section className="ov-grid">
        <div className="ov-card ov-box">
          <h3>
            آخر الحجوزات
            <button className="ov-link" onClick={() => onNavigate('bookings')}>عرض الكل</button>
          </h3>
          {stats.latest.length === 0 ? (
            <p className="admin-form__hint">مفيش حجوزات في آخر 30 يوم.</p>
          ) : (
            <table className="ov-table">
              <thead>
                <tr><th>العميل</th><th>النوع</th><th>المكان</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {stats.latest.map((b) => (
                  <tr key={b.id || b.booking_ref}>
                    <td>{b.name}</td>
                    <td>{MODES[b.mode] || b.mode}</td>
                    <td>{b.mode === 'home' ? 'في البيت' : b.branch_name || '—'}</td>
                    <td><span className={`ov-tag${b.status === 'جديد' ? ' warn' : b.status === 'ملغي' ? ' off' : ''}`}>{b.status || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ov-side">
          <div className="ov-card ov-box">
            <h3>حجوزات آخر 7 أيام</h3>
            <div className="ov-bars">
              {stats.week.map((w, i) => (
                <div className="ov-bars__col" key={i}>
                  <i className={w.today ? 'on' : ''} style={{ height: `${Math.max(8, (w.count / stats.weekMax) * 100)}%` }} title={num(w.count)} />
                  <span>{w.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ov-card ov-box">
            <h3>الأكثر حجزًا</h3>
            {stats.topPlaces.length === 0 && <p className="admin-form__hint">لسه مفيش بيانات.</p>}
            {stats.topPlaces.map(([name, count]) => (
              <div className="ov-place" key={name}>
                <b>{name}</b>
                <span className="ov-place__bar"><u style={{ width: `${(count / stats.placeMax) * 100}%` }} /></span>
                <small>{num(count)}</small>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
