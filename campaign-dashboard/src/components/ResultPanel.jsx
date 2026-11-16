import { validateResult, summarizeResult } from '../lib/results.js'

const FIELDS = [
  ['reach', 'الوصول'],
  ['engagement', 'التفاعل'],
  ['bookings', 'الحجوزات'],
  ['spend', 'المصروف'],
]

export default function ResultPanel({ post, benchmarks, onChange }) {
  if (post.status !== 'published') {
    return (
      <section className="result-panel">
        <p className="muted">النتيجة بتتسجل بعد ما البوست يتنشر (غيّر الحالة لـ "اتنشر").</p>
      </section>
    )
  }
  const result = post.result ?? {}
  const check = validateResult(result)
  const s = check.ok ? summarizeResult(post, result, benchmarks) : null
  const set = (key, raw) => onChange({ [key]: raw === '' ? null : Number(raw) })

  return (
    <section className="result-panel">
      <strong>نتيجة بعد النشر 📊</strong>
      <div className="row wrap">
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`r-${key}-${post.id}`}>{label}{key === 'spend' ? ' (جنيه)' : ''}</label>
            <input
              id={`r-${key}-${post.id}`}
              type="number"
              min="0"
              placeholder="اختياري"
              value={result[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              aria-label={label}
            />
          </div>
        ))}
      </div>
      {!check.ok && <p role="alert" className="warn">{check.message}</p>}
      {s && (s.costPerBooking !== null || s.budgetUse !== null || s.vs) && (
        <ul className="result-summary">
          {s.costPerBooking !== null && <li>تكلفة الحجز الواحد: <strong>{s.costPerBooking} جنيه</strong></li>}
          {s.budgetUse !== null && <li>صرفت {s.budgetUse}% من الميزانية المخططة</li>}
          {s.vs && <li>{s.vs.metric}: <strong>{s.vs.verdict}</strong> <span className="muted">(×{s.vs.ratio})</span></li>}
        </ul>
      )}
    </section>
  )
}
