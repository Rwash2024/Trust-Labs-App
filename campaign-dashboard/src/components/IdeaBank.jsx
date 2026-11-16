import { readiness } from '../lib/checklist.js'

export default function IdeaBank({ ideas, posts, onReuse, onToggleCheck }) {
  if (!ideas.length) return <p className="muted">لسه مفيش أفكار. اكتب أول فكرة 👆</p>
  return (
    <ul className="idea-bank">
      {ideas.map((i) => {
        const r = readiness(i, posts)
        return (
          <li key={i.id} className="card">
            <div className="row between">
              <div>
                <strong>{i.text}</strong>
                <span className="muted"> · {posts.filter((p) => p.ideaId === i.id).length} منشور · {i.createdAt}</span>
              </div>
              <button type="button" className="btn" onClick={() => onReuse(i.text)}>استخدمها تاني</button>
            </div>
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
