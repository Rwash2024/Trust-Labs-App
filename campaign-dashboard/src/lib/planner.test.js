import { buildMonthPlan, movePost } from './planner.js'
import { normalizeArabic, similarity, findSimilarIdeas } from './similarity.js'

const opts = (year, month, mix) => ({
  year, month, mix, platforms: ['instagram', 'facebook'],
  timesByPlatform: { instagram: ['20:00'], facebook: ['19:00'] },
})
const total = (m) => Object.values(m).reduce((a, b) => a + b, 0)

test.each([[2027, 2, 28], [2026, 12, 31]])('plan %i-%i has exact total and stays in month', (y, m, days) => {
  const mix = { post: 6, reel: 4, carousel: 3, story: 8 }
  const plan = buildMonthPlan(opts(y, m, mix))
  expect(plan).toHaveLength(total(mix))
  const prefix = `${y}-${String(m).padStart(2, '0')}-`
  for (const p of plan) {
    expect(p.date.startsWith(prefix)).toBe(true)
    expect(Number(p.date.slice(8))).toBeLessThanOrEqual(days)
  }
})

test('no two items of the same type on the same day', () => {
  const plan = buildMonthPlan(opts(2026, 12, { post: 10, reel: 10, carousel: 5, story: 10 }))
  const seen = new Set()
  for (const p of plan) { const k = p.date + p.type; expect(seen.has(k)).toBe(false); seen.add(k) }
})

test('movePost moves within the month and ignores other months', () => {
  const posts = [{ id: 'a', date: '2026-12-10' }]
  expect(movePost(posts, 'a', '2026-12-20')[0].date).toBe('2026-12-20')
  expect(movePost(posts, 'a', '2027-01-02')).toBe(posts)
  expect(movePost(posts, 'zzz', '2026-12-20')).toBe(posts)
})

test('normalizeArabic strips diacritics, tatweel and unifies letters', () => {
  expect(normalizeArabic('أنقِذ قلـبَك')).toBe('انقذ قلبك')
})

test('similarity handles diacritic and hamza variants', () => {
  expect(similarity('قَلبك مش لعبة', 'قلبك مش لعبه')).toBeGreaterThan(0.9)
})

test('findSimilarIdeas flags variants and ignores unrelated', () => {
  const r = findSimilarIdeas('انقذ قلبك', ['أنقذ قلبك', 'باقة الغدة الدرقية'])
  expect(r).toEqual(['أنقذ قلبك'])
})
