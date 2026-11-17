import { summarizeInstagram, summarizeFacebook, applyRefresh } from './competitorStats.js'

// 2026-11-18 is a Wednesday, 2026-11-19 a Thursday; Cairo is UTC+2 in November.
const at = (iso) => Math.floor(Date.parse(iso) / 1000)
const igItems = [
  { id: '1', taken_at: at('2026-11-18T16:30:00Z'), like_count: 100, product_type: 'feed' },
  { id: '2', taken_at: at('2026-11-18T16:10:00Z'), like_count: 50, product_type: 'clips', play_count: 20000 },
  { id: '3', taken_at: at('2026-11-19T09:00:00Z'), like_count: 30, product_type: 'clips', ig_play_count: 10000 },
  { id: '4', taken_at: at('2026-11-18T19:30:00Z'), like_count: 20, product_type: 'feed' },
]

test('instagram: count, average likes (1 decimal) and average reel plays', () => {
  const s = summarizeInstagram(igItems)
  expect(s.n).toBe(4)
  expect(s.avgLikes).toBe(50)
  expect(s.reelPlays).toBe(15000)
})

test('instagram: top days and hours use Cairo time', () => {
  const s = summarizeInstagram(igItems)
  expect(s.topDays[0]).toEqual({ day: 'الأربعاء', count: 3 })
  expect(s.topDays[1]).toEqual({ day: 'الخميس', count: 1 })
  expect(s.topHours[0]).toEqual({ hour: 18, count: 2 })
  expect(s.topHours.length).toBeLessThanOrEqual(3)
})

test('instagram: no reels means zero reel plays, no posts means zeros and never NaN', () => {
  expect(summarizeInstagram([{ id: 'x', taken_at: at('2026-11-18T10:00:00Z'), like_count: 5 }]).reelPlays).toBe(0)
  expect(summarizeInstagram([])).toEqual({ n: 0, avgLikes: 0, reelPlays: 0, topDays: [], topHours: [] })
})

test('instagram: the same post pulled twice is counted once', () => {
  expect(summarizeInstagram([...igItems, igItems[0]]).n).toBe(4)
})

test('facebook: count, average reactions and comments', () => {
  const s = summarizeFacebook([
    { id: 'a', reactionCount: 100, commentCount: 10 },
    { id: 'b', reactionCount: 50, commentCount: 5 },
    { id: 'c', reactionCount: 0, commentCount: 0 },
  ])
  expect(s).toEqual({ posts: 3, avgReactions: 50, avgComments: 5 })
  expect(summarizeFacebook([])).toEqual({ posts: 0, avgReactions: 0, avgComments: 0 })
})

const data = () => ({
  pulledAt: '2026-11-16',
  note: 'عينة انستجرام: آخر 72 بوست. اتسحبت 2026-11-16. مؤشرات مش حكم نهائي.',
  insights: ['ملاحظة بخط اليد'],
  competitors: [
    { name: 'المختبر', instagram: 'a', facebook: 'f', sample: { posts: 78, avgLikes: 53.7, dataQuality: 'ok', notes: 'ملاحظات بخط اليد' }, posting: { n: 72, topDays: [], topHours: [] }, fb: { posts: 6, avgReactions: 1090, avgComments: 49.2 }, ig: { posts: 72, avgLikes: 53.7, reelPlays: 30153 } },
    { name: 'الشمس', facebook: 'g', sample: { posts: 6, avgLikes: 0, dataQuality: 'partial', notes: 'فيسبوك بس' }, fb: { posts: 6, avgReactions: 14, avgComments: 2 } },
  ],
})

test('applyRefresh updates the numbers, the pull date and the date in the note', () => {
  const out = applyRefresh(data(), { ig: { المختبر: igItems }, fb: { المختبر: [{ id: 'a', reactionCount: 100, commentCount: 10 }] } }, '2026-12-20')
  const c = out.competitors[0]
  expect(out.pulledAt).toBe('2026-12-20')
  expect(out.note).toContain('اتسحبت 2026-12-20')
  expect(c.ig).toEqual({ posts: 4, avgLikes: 50, reelPlays: 15000 })
  expect(c.posting.n).toBe(4)
  expect(c.fb).toEqual({ posts: 1, avgReactions: 100, avgComments: 10 })
  expect(c.sample.posts).toBe(5)
  expect(c.sample.avgLikes).toBe(50)
})

test('applyRefresh never touches hand-written text, handles or data quality', () => {
  const out = applyRefresh(data(), { ig: { المختبر: igItems } }, '2026-12-20')
  const c = out.competitors[0]
  expect(c.sample.notes).toBe('ملاحظات بخط اليد')
  expect(c.sample.dataQuality).toBe('ok')
  expect([c.instagram, c.facebook]).toEqual(['a', 'f'])
  expect(out.insights).toEqual(['ملاحظة بخط اليد'])
})

test('a competitor with no new data keeps its old numbers; the input is not mutated', () => {
  const input = data()
  const copy = JSON.parse(JSON.stringify(input))
  const out = applyRefresh(input, { ig: { المختبر: igItems } }, '2026-12-20')
  expect(out.competitors[1]).toEqual(copy.competitors[1])
  expect(input).toEqual(copy)
})

test('an empty pull (blocked or failed) does not wipe existing numbers', () => {
  const out = applyRefresh(data(), { ig: { المختبر: [] }, fb: { المختبر: [] } }, '2026-12-20')
  expect(out.competitors[0].ig.posts).toBe(72)
  expect(out.competitors[0].fb.posts).toBe(6)
})

test('refreshing only Facebook keeps the Instagram numbers and rebuilds the combined count', () => {
  const out = applyRefresh(data(), { fb: { المختبر: [{ id: 'a', reactionCount: 10, commentCount: 1 }, { id: 'b', reactionCount: 20, commentCount: 3 }] } }, '2026-12-20')
  const c = out.competitors[0]
  expect(c.ig.posts).toBe(72)
  expect(c.sample.posts).toBe(74)
})
