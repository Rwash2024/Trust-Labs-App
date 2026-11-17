import { readiness } from '../lib/checklist.js'
import { campaignTotals } from '../lib/results.js'
import { useState } from 'react'
import { APPROVAL_STATUSES, approvalOf } from '../lib/approval.js'

function ApprovalRow({ idea, onSetApproval }) {
  const a = approvalOf(idea)
  const [note, setNote] = useState(a.note)
  return (
    <div className="approval-row row wrap">
      <div>
        <label htmlFor={`ap-${idea.id}`}>حالة موافقة الإدارة</label>
        <select id={`ap-${idea.id}`} value={a.status} aria-label="حالة موافقة الإدارة" className={`approval ${a.status}`} onChange={(e) => onSetApproval?.(idea.id, e.target.value, note)}>
          {APPROVAL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      <div className="grow">
        <label htmlFor={`apn-${idea.id}`}>ملاحظة الموافقة</label>
        <input id={`apn-${idea.id}`} value={note} aria-label="ملاحظة الموافقة" placeholder="مثال: وافق أستاذ عمر على الواتساب" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== a.note && onSetApproval?.(idea.id, a.status, note)} />
      </div>
      {a.at && a.status !== 'draft' && <span className="muted approval-date">آخر تحديث: <bdi dir="ltr">{a.at}</bdi></span>}
    </div>
  )
}

export default function IdeaBank({ ideas, posts, onReuse, onToggleCheck, onSetApproval }) {
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
            <ApprovalRow idea={i} onSetApproval={onSetApproval} />
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
