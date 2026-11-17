// Turns raw competitor posts (as the data provider returns them) into the numbers stored in data/competitors.json.
// Hand-written text (notes, insights, data quality, handles) is never touched.

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', hour12: false })

const round1 = (n) => Math.round(n * 10) / 10
const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)
const top3 = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)

const dedupe = (items) => {
  const seen = new Set()
  return (items ?? []).filter((it) => {
    const id = String(it?.id ?? '')
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export function summarizeInstagram(rawItems) {
  const items = dedupe(rawItems)
  const days = {}
  const hours = {}
  for (const it of items) {
    if (!it.taken_at) continue
    const parts = fmt.formatToParts(new Date(it.taken_at * 1000))
    const wd = WEEKDAY[parts.find((p) => p.type === 'weekday')?.value]
    const hr = Number(parts.find((p) => p.type === 'hour')?.value) % 24
    if (wd !== undefined) days[DAYS_AR[wd]] = (days[DAYS_AR[wd]] || 0) + 1
    if (!Number.isNaN(hr)) hours[hr] = (hours[hr] || 0) + 1
  }
  const reels = items.filter((it) => it.product_type === 'clips')
  return {
    n: items.length,
    avgLikes: round1(avg(items.map((it) => it.like_count ?? 0))),
    reelPlays: Math.round(avg(reels.map((it) => it.play_count ?? it.ig_play_count ?? 0))),
    topDays: top3(days).map(([day, count]) => ({ day, count })),
    topHours: top3(hours).map(([hour, count]) => ({ hour: Number(hour), count })),
  }
}

export function summarizeFacebook(rawItems) {
  const items = dedupe(rawItems)
  return {
    posts: items.length,
    avgReactions: round1(avg(items.map((it) => it.reactionCount ?? 0))),
    avgComments: round1(avg(items.map((it) => it.commentCount ?? 0))),
  }
}

// results = { ig: { [competitor name]: items[] }, fb: { [competitor name]: items[] } }
export function applyRefresh(data, results, pulledAt) {
  const competitors = data.competitors.map((c) => {
    const igItems = results.ig?.[c.name]
    const fbItems = results.fb?.[c.name]
    const next = { ...c, sample: { ...c.sample } }
    if (igItems?.length) {
      const s = summarizeInstagram(igItems)
      next.ig = { posts: s.n, avgLikes: s.avgLikes, reelPlays: s.reelPlays }
      next.posting = { n: s.n, topDays: s.topDays, topHours: s.topHours }
      next.sample.avgLikes = s.avgLikes
    }
    if (fbItems?.length) next.fb = summarizeFacebook(fbItems)
    if (igItems?.length || fbItems?.length) next.sample.posts = (next.ig?.posts ?? 0) + (next.fb?.posts ?? 0)
    return next
  })
  const note = typeof data.note === 'string' ? data.note.replace(/اتسحبت \d{4}-\d{2}-\d{2}/, `اتسحبت ${pulledAt}`) : data.note
  return { ...data, pulledAt, note, competitors }
}
