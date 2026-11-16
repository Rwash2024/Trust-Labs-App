import { validateResult, summarizeResult, campaignTotals } from './results.js'

const B = { fbTop3Avg: 200, igLikesMedian: 100, reelPlaysMedian: 10000 }
const fb = { type: 'post', platform: 'facebook', ad: { enabled: true, budget: 2000 } }
const reel = { type: 'reel', platform: 'instagram' }
const igPost = { type: 'carousel', platform: 'instagram' }

test('validateResult accepts blanks and non-negative numbers, rejects negatives and text', () => {
  expect(validateResult({ reach: null, engagement: null, bookings: null, spend: null }).ok).toBe(true)
  expect(validateResult({ reach: 1200, engagement: 80, bookings: 5, spend: 900 }).ok).toBe(true)
  for (const bad of [{ reach: -1 }, { spend: 'abc' }, { bookings: 2.5 }, { engagement: Infinity }]) {
    const r = validateResult(bad)
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/[؀-ۿ]/)
  }
})

test('cost per booking and budget use are computed only when the inputs exist', () => {
  const s = summarizeResult({ ...fb }, { reach: 5000, engagement: 300, bookings: 10, spend: 1500 }, B)
  expect(s.costPerBooking).toBe(150)
  expect(s.budgetUse).toBe(75)
  const none = summarizeResult({ ...fb }, { reach: 5000, engagement: 300, bookings: 0, spend: 1500 }, B)
  expect(none.costPerBooking).toBeNull()
  expect(summarizeResult({ ...fb }, {}, B).costPerBooking).toBeNull()
})

test('facebook post is compared with the top-3 competitor reactions', () => {
  const s = summarizeResult(fb, { engagement: 300 }, B)
  expect(s.vs.metric).toMatch(/فيسبوك/)
  expect(s.vs.ratio).toBe(1.5)
  expect(s.vs.verdict).toBe('أعلى من المنافسين')
})

test('reel is compared on reach with the competitor median plays', () => {
  const s = summarizeResult(reel, { reach: 4000 }, B)
  expect(s.vs.ratio).toBe(0.4)
  expect(s.vs.verdict).toBe('أقل من المنافسين')
})

test('instagram non-reel uses engagement against median likes; middle band is "قريب"', () => {
  const s = summarizeResult(igPost, { engagement: 70 }, B)
  expect(s.vs.ratio).toBe(0.7)
  expect(s.vs.verdict).toBe('قريب من المنافسين')
})

test('no comparison when the number is missing or the benchmark is zero', () => {
  expect(summarizeResult(reel, {}, B).vs).toBeNull()
  expect(summarizeResult(reel, { reach: 100 }, { ...B, reelPlaysMedian: 0 }).vs).toBeNull()
})

test('campaignTotals adds up only posts that have results', () => {
  const posts = [
    { id: 'a', ideaId: 'i', result: { spend: 1000, bookings: 5, reach: 4000 } },
    { id: 'b', ideaId: 'i', result: { spend: 500, bookings: 0, reach: 1000 } },
    { id: 'c', ideaId: 'i' },
    { id: 'd', ideaId: 'other', result: { spend: 999, bookings: 9, reach: 9 } },
  ]
  const t = campaignTotals(posts, 'i')
  expect(t).toEqual({ posts: 2, spend: 1500, bookings: 5, reach: 5000, costPerBooking: 300 })
  expect(campaignTotals([], 'i')).toBeNull()
})
