import { useState } from 'react'
import { findSimilarIdeas } from '../lib/similarity.js'

const MIX_LABELS = { post: 'بوست', reel: 'ريلز', carousel: 'كاروسيل', story: 'استوري' }

function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function IdeaForm({ existingIdeas, onSubmit, initialIdea = '' }) {
  const [idea, setIdea] = useState(initialIdea)
  const [month, setMonth] = useState(currentMonth())
  const [mix, setMix] = useState({ post: 4, reel: 3, carousel: 2, story: 6 })
  const similar = idea.trim() ? findSimilarIdeas(idea, existingIdeas) : []

  return (
    <form
      className="card idea-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (idea.trim()) onSubmit({ idea: idea.trim(), month, mix })
      }}
    >
      <h2>فكرة جديدة ✨</h2>
      <label htmlFor="idea">فكرة الحملة</label>
      <input id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="مثال: حملة ضغط الدم" />
      {similar.length > 0 && <p className="warn">شبه فكرة سابقة: {similar.join('، ')}</p>}

      <div className="row wrap">
        <div>
          <label htmlFor="month">الشهر</label>
          <input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {Object.entries(MIX_LABELS).map(([k, label]) => (
          <div key={k}>
            <label htmlFor={`mix-${k}`}>{label}</label>
            <input
              id={`mix-${k}`}
              type="number"
              min="0"
              max="31"
              value={mix[k]}
              onChange={(e) => setMix({ ...mix, [k]: Math.max(0, Math.min(31, Number(e.target.value) || 0)) })}
            />
          </div>
        ))}
      </div>
      <button type="submit" className="btn primary" disabled={!idea.trim()}>جهّز الخطة</button>
    </form>
  )
}
