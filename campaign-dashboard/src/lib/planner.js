const pad = (n) => String(n).padStart(2, '0')

// Deterministic: spreads each type evenly over the month, never twice per day for one type.
export function buildMonthPlan({ year, month, mix, platforms, timesByPlatform }) {
  const days = new Date(year, month, 0).getDate()
  const out = []
  let platformCursor = 0
  Object.entries(mix).forEach(([type, count], typeIndex) => {
    const used = new Set()
    for (let i = 0; i < count; i++) {
      let day = Math.floor(((i + 0.5) * days) / count + typeIndex) % days
      let guard = 0
      while (used.has(day) && guard++ < days) day = (day + 1) % days
      used.add(day)
      const platform = platforms[platformCursor++ % platforms.length]
      const times = timesByPlatform[platform] || ['20:00']
      out.push({ date: `${year}-${pad(month)}-${pad(day + 1)}`, type, platform, time: times[i % times.length] })
    }
  })
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function movePost(posts, id, newDate) {
  const post = posts.find((p) => p.id === id)
  if (!post || newDate.slice(0, 7) !== post.date.slice(0, 7)) return posts
  return posts.map((p) => (p.id === id ? { ...p, date: newDate } : p))
}
