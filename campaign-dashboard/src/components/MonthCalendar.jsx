const WEEKDAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const TYPE_LABEL = { post: 'بوست', reel: 'ريلز', carousel: 'كاروسيل', story: 'استوري' }
const pad = (n) => String(n).padStart(2, '0')

function shiftDate(date, delta) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function MonthCalendar({ year, month, posts, onMove, onSelect }) {
  const days = new Date(year, month, 0).getDate()
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 1) % 7 // Saturday-first
  const prefix = `${year}-${pad(month)}`
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]

  function move(post, delta) {
    const next = shiftDate(post.date, delta)
    if (next.startsWith(prefix)) onMove(post.id, next)
  }

  return (
    <div className="calendar">
      {WEEKDAYS.map((w) => <div key={w} className="cal-head">{w}</div>)}
      {cells.map((day, i) => {
        if (day === null) return <div key={`e${i}`} className="cal-cell empty" />
        const date = `${prefix}-${pad(day)}`
        const dayPosts = posts.filter((p) => p.date === date)
        return (
          <div
            key={date}
            data-day={date}
            className="cal-cell"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) onMove(id, date)
            }}
          >
            <span className="cal-num">{day}</span>
            {dayPosts.map((p) => (
              <div
                key={p.id}
                className={`cal-chip type-${p.type}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
                onClick={() => onSelect(p.id)}
              >
                <span>{TYPE_LABEL[p.type]} · {p.headline || '—'}</span>
                <span className="chip-moves" onClick={(e) => e.stopPropagation()}>
                  <button type="button" aria-label="لليوم السابق" disabled={day === 1} onClick={() => move(p, -1)}>›</button>
                  <button type="button" aria-label="لليوم التالي" disabled={day === days} onClick={() => move(p, 1)}>‹</button>
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
