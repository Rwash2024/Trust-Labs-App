import { recommendAd } from './ads.js'

const bench = { fbTop3Avg: 150, fbBest: null, igLikesMedian: 80, reelPlaysMedian: 10000 }
const post = (over = {}) => ({ id: 'p', type: 'reel', platform: 'instagram', headline: 'احجز', caption: 'احجز زيارة منزلية', panelService: 'باقة', ...over })

test('every funded recommendation carries a health-ads policy reminder (goals and audience names)', () => {
  for (const type of ['post', 'reel', 'carousel']) {
    const r = recommendAd(post({ type }), { category: 'general', benchmarks: bench })
    const text = r.reasons.join(' ')
    expect(text, type).toMatch(/سياسة ميتا/)
    expect(text, type).toMatch(/رسائل/)
  }
})

test('stories get the reminder too, since they can still be boosted', () => {
  const r = recommendAd(post({ type: 'story' }), { category: 'general', benchmarks: bench })
  expect(r.reasons.join(' ')).toMatch(/سياسة ميتا/)
})
