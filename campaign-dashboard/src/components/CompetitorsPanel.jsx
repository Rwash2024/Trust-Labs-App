import { summarizePosting } from '../lib/postingStats.js'

const BADGE = {
  ok: { text: 'سليمة', cls: 'ok' },
  old: { text: 'قديمة', cls: 'old' },
  partial: { text: 'جزئية', cls: 'partial' },
  missing: { text: 'ناقصة', cls: 'missing' },
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08:00 - 23:00

function PostingChart({ competitors }) {
  const s = summarizePosting(competitors)
  if (!s.totalPosts) return null
  const max = Math.max(...HOURS.map((h) => s.hourCounts[h] || 0), 1)
  return (
    <div className="card posting">
      <h3>ساعات نشر المنافسين 🕒</h3>
      <p className="muted">
        من عينة المنافسين اللي عندنا (توقيت القاهرة، أكتر 3 ساعات لكل واحد). {s.eveningShare === 0 ? ' ولا منشور منها بعد الساعة 7 مساءً.' : ` حوالي ${Math.round(s.eveningShare * 100)}% بس منها بعد الساعة 7 مساءً.`}
        {s.busiestDays.length > 0 && ` أكتر الأيام: ${s.busiestDays.map((d) => d.day).join('، ')}.`}
      </p>
      <div className="bars" role="img" aria-label="عدد منشورات المنافسين حسب الساعة">
        {HOURS.map((h) => (
          <div key={h} className="bar-col" title={`${h}:00 — ${s.hourCounts[h] || 0} منشور`}>
            <i style={{ height: `${((s.hourCounts[h] || 0) / max) * 100}%` }} className={h >= 19 ? 'eve' : ''} />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FacebookRanking({ competitors }) {
  const rows = competitors.filter((c) => c.fb).sort((a, b) => b.fb.avgReactions - a.fb.avgReactions)
  if (!rows.length) return null
  const max = Math.max(...rows.map((c) => c.fb.avgReactions), 1)
  return (
    <div className="card fb-rank">
      <h3>ترتيب تفاعل فيسبوك 👍</h3>
      <p className="muted">متوسط التفاعلات للبوست في العينة. جزء من الفرق سببه حجم جمهور كل صفحة مش جودة المحتوى بس.</p>
      {rows.map((c) => (
        <div key={c.name} className="rank-row">
          <span className="rank-name">{c.name}</span>
          <span className="rank-bar"><i style={{ width: `${(c.fb.avgReactions / max) * 100}%` }} /></span>
          <bdi dir="ltr" className="rank-num">{c.fb.avgReactions}</bdi>
        </div>
      ))}
    </div>
  )
}

export default function CompetitorsPanel({ competitors, insights, note }) {
  return (
    <section className="competitors">
      {note && <p className="muted">{note}</p>}
      <div className="insights card">
        <h3>الفراغ وإزاي نكسب 🎯</h3>
        <ul>{insights.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
      <FacebookRanking competitors={competitors} />
      <PostingChart competitors={competitors} />
      <div className="grid">
        {competitors.map((c) => {
          const b = BADGE[c.sample.dataQuality]
          return (
            <article key={c.name} className="card competitor">
              <header className="row between">
                <h4>{c.name}</h4>
                <span className={`badge ${b.cls}`}>{b.text}</span>
              </header>
              <p>{c.sample.notes}</p>
              {c.sample.avgLikes != null && <p className="muted">متوسط اللايكات: {c.sample.avgLikes}</p>}
              {c.fb && (
                <p className="muted">
                  فيسبوك: {c.fb.posts} بوست · متوسط {c.fb.avgReactions} تفاعل و{c.fb.avgComments} تعليق
                </p>
              )}
              {c.posting && (
                <p className="muted">
                  بينزل غالبًا: {c.posting.topDays.map((d) => d.day).join('، ')} · الساعة {c.posting.topHours.map((h) => `${h.hour}:00`).join('، ')}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
