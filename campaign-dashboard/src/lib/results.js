// Real results typed in after a post goes out, compared with the competitor benchmarks
// and (for funded posts) with the planned budget. Everything is optional: blank = unknown.

const FIELDS = [
  ['reach', 'الوصول'],
  ['engagement', 'التفاعل'],
  ['bookings', 'الحجوزات'],
  ['spend', 'المصروف'],
]

export function validateResult(result) {
  for (const [key, label] of FIELDS) {
    const v = result?.[key]
    if (v === null || v === undefined) continue
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { ok: false, message: `${label}: لازم رقم صفر أو أكبر.` }
    if (key === 'bookings' && !Number.isInteger(v)) return { ok: false, message: 'الحجوزات: لازم عدد صحيح.' }
  }
  return { ok: true }
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d

function verdict(ratio) {
  if (ratio >= 1) return 'أعلى من المنافسين'
  if (ratio >= 0.5) return 'قريب من المنافسين'
  return 'أقل من المنافسين'
}

function comparison(post, result, bench) {
  let metric
  let mine
  let base
  if (post.platform === 'facebook') {
    metric = 'التفاعل مقابل أعلى 3 صفحات فيسبوك'
    mine = num(result.engagement)
    base = bench?.fbTop3Avg
  } else if (post.type === 'reel') {
    metric = 'الوصول مقابل متوسط مشاهدات ريلز المنافسين'
    mine = num(result.reach)
    base = bench?.reelPlaysMedian
  } else {
    metric = 'التفاعل مقابل متوسط لايكات انستجرام'
    mine = num(result.engagement)
    base = bench?.igLikesMedian
  }
  if (mine === null || !base) return null
  const ratio = round(mine / base)
  return { metric, ratio, verdict: verdict(ratio) }
}

export function summarizeResult(post, result = {}, benchmarks) {
  const spend = num(result.spend)
  const bookings = num(result.bookings)
  const planned = post.ad?.enabled ? num(post.ad.budget) : null
  return {
    costPerBooking: spend !== null && bookings ? round(spend / bookings) : null,
    budgetUse: spend !== null && planned ? Math.round((spend / planned) * 100) : null,
    vs: comparison(post, result, benchmarks),
  }
}

export function campaignTotals(posts, ideaId) {
  const withResult = posts.filter((p) => p.ideaId === ideaId && p.result)
  if (!withResult.length) return null
  const sum = (key) => withResult.reduce((a, p) => a + (num(p.result[key]) ?? 0), 0)
  const spend = sum('spend')
  const bookings = sum('bookings')
  return {
    posts: withResult.length,
    spend,
    bookings,
    reach: sum('reach'),
    costPerBooking: bookings ? round(spend / bookings) : null,
  }
}
