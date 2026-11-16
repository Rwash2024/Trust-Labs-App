import { readiness } from '../lib/checklist.js'
import { campaignTotals } from '../lib/results.js'

export default function IdeaBank({ ideas, posts, onReuse, onToggleCheck }) {
  if (!ideas.length) return <p className="muted">لسه مفيش أفكار. اكتب أول فكرة 👆</p>
  return (
    <ul className="idea-bank">
      {ideas.map((i) => {
        const r = readiness(i, posts)
        const t = campaignTotals(posts, i.id)
        return (
          <li key={i.id} className="card">
            <div className="row between">
              <div>
                <strong>{i.text}</strong>
                <span className="muted"> · {posts.filter((p) => p.ideaId === i.id).length} منشور · {i.createdAt}</span>
              </div>
              <button type="button" className="btn" onClick={() => onReuse(i.text)}>استخدمها تاني</button>
            </div>
            {t && (
              <p className="muted">
                إجمالي النتائج ({t.posts} منشور): مصروف {t.spend.toLocaleString('en-US')} جنيه · {t.bookings} حجز · وصول {t.reach.toLocaleString('en-US')}
                {t.costPerBooking !== null && ` · تكلفة الحجز ${t.costPerBooking} جنيه`}
              </p>
            )}
            <details className="readiness" open={r.done < r.total && r.done > 0}>
              <summary>
                جاهزية الحملة · <bdi dir="ltr">{r.done} / {r.total}</bdi>
                {r.ready && <span className="ready-tag"> ✅ جاهزة للإطلاق</span>}
              </summary>
              <ul className="check-list">
                {r.items.map((it) => (
                  <li key={it.id}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={it.done}
                        disabled={it.auto}
                        onChange={() => onToggleCheck(i.id, it.id)}
                        aria-label={it.label}
                      />
                      {it.label}
                      {it.auto && <small className="muted"> (تلقائي)</small>}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        )
      })}
    </ul>
  )
}
