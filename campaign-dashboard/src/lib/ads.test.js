import { REGIONS, emptyAd, validateAd, suggestAudience, suggestBudget, seasonFor, computeBenchmarks, recommendAd, buildAdBrief } from './ads.js'

describe('REGIONS (built from the real branches)', () => {
  test('has 16 unique areas with the two priority areas in tier 1', () => {
    expect(REGIONS).toHaveLength(16)
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(16)
    const tier1 = REGIONS.filter((r) => r.tier === 1).map((r) => r.id).sort()
    expect(tier1).toEqual(['التجمع الخامس', 'المهندسين'].sort())
    expect(REGIONS.filter((r) => r.tier === 2).map((r) => r.id).sort()).toEqual(['الجيزة', 'الدقي', 'المنيل', 'مدينة نصر', 'مصر الجديدة'].sort())
  })
})

describe('validateAd', () => {
  const ok = () => ({ ...emptyAd(), enabled: true, regions: ['المهندسين'], budget: 850 })
  test('a disabled default ad is valid', () => {
    expect(validateAd(emptyAd()).ok).toBe(true)
  })
  test('budget is optional and must not be negative', () => {
    expect(validateAd({ ...ok(), budget: null }).ok).toBe(true)
    expect(validateAd({ ...ok(), budget: -5 }).ok).toBe(false)
    expect(validateAd({ ...ok(), budget: Number.NaN }).ok).toBe(false)
  })
  test('age range must be 18-65 and ordered', () => {
    expect(validateAd({ ...ok(), ageFrom: 17 }).ok).toBe(false)
    expect(validateAd({ ...ok(), ageTo: 66 }).ok).toBe(false)
    expect(validateAd({ ...ok(), ageFrom: 40, ageTo: 30 }).ok).toBe(false)
  })
  test('gender, days and regions are checked', () => {
    expect(validateAd({ ...ok(), gender: 'x' }).ok).toBe(false)
    expect(validateAd({ ...ok(), days: 0 }).ok).toBe(false)
    expect(validateAd({ ...ok(), days: 31 }).ok).toBe(false)
    expect(validateAd({ ...ok(), regions: ['مكان غريب'] }).ok).toBe(false)
  })
  test('an enabled ad needs at least one region, with an Arabic message', () => {
    const r = validateAd({ ...ok(), regions: [] })
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/[؀-ۿ]/)
  })
})

describe('suggestAudience', () => {
  test.each([
    ['heart', 40, 65, 'all'],
    ['thyroid', 25, 50, 'female'],
    ['pregnancy', 22, 38, 'female'],
    ['diabetes', 35, 65, 'all'],
    ['general', 25, 55, 'all'],
    ['unknown-thing', 25, 55, 'all'],
  ])('%s -> %i-%i %s', (cat, from, to, gender) => {
    const a = suggestAudience(cat)
    expect([a.ageFrom, a.ageTo, a.gender]).toEqual([from, to, gender])
    expect(a.why.length).toBeGreaterThan(5)
  })
})

describe('suggestBudget', () => {
  const two = ['المهندسين', 'التجمع الخامس']
  test('anchors on Mohamed\'s per-post boost amounts (EGP)', () => {
    expect(suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: two, season: 'normal' }).total).toBe(850)
    expect(suggestBudget({ postType: 'reel', goal: 'sales', days: 7, regions: two, season: 'normal' }).total).toBe(600)
    expect(suggestBudget({ postType: 'carousel', goal: 'sales', days: 7, regions: two, season: 'normal' }).total).toBe(450)
    expect(suggestBudget({ postType: 'story', goal: 'sales', days: 7, regions: two, season: 'normal' }).total).toBe(200)
  })
  test('high season multiplies by 1.5 and more regions add up to +100%', () => {
    const seven = [...two, 'الدقي', 'المنيل', 'مدينة نصر', 'مصر الجديدة', 'الجيزة']
    expect(suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: seven, season: 'high' }).total).toBe(2550)
  })
  test('days scale the budget, clamped between half and double', () => {
    expect(suggestBudget({ postType: 'post', goal: 'sales', days: 14, regions: two, season: 'normal' }).total).toBe(1700)
    expect(suggestBudget({ postType: 'post', goal: 'sales', days: 3, regions: two, season: 'normal' }).total).toBe(450)
    expect(suggestBudget({ postType: 'post', goal: 'sales', days: 30, regions: two, season: 'normal' }).total).toBe(1700)
  })
  test('min and max bracket the total, per-day is total over days', () => {
    const s = suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: two, season: 'normal' })
    expect(s.min).toBeLessThan(s.total)
    expect(s.max).toBeGreaterThan(s.total)
    expect(s.perDay).toBe(Math.round(s.total / 7))
  })
  test('the split adds up to the total and favors priority branches', () => {
    const s = suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: ['المهندسين', 'الدقي', 'الغردقة'], season: 'high' })
    expect(s.split.reduce((a, x) => a + x.amount, 0)).toBe(s.total)
    const by = Object.fromEntries(s.split.map((x) => [x.region, x.amount]))
    expect(by['المهندسين']).toBeGreaterThan(by['الدقي'])
    expect(by['الدقي']).toBeGreaterThan(by['الغردقة'])
  })
  test('no regions still returns a base budget and an empty split', () => {
    const s = suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: [], season: 'normal' })
    expect(s.total).toBe(850)
    expect(s.split).toEqual([])
  })
  test('explains itself in Arabic and carries scaling rules', () => {
    const s = suggestBudget({ postType: 'post', goal: 'sales', days: 7, regions: two, season: 'high' })
    expect(s.basis.length).toBeGreaterThanOrEqual(3)
    expect(s.basis.join(' ')).toMatch(/[؀-ۿ]/)
    expect(s.rules.length).toBeGreaterThanOrEqual(3)
  })
})

describe('seasonFor', () => {
  test('Black Friday window (Nov 20 - Dec 2) is the high season, other dates are normal', () => {
    expect(seasonFor('2026-11-27')).toBe('high')
    expect(seasonFor('2026-11-20')).toBe('high')
    expect(seasonFor('2026-12-02')).toBe('high')
    expect(seasonFor('2026-11-19')).toBe('normal')
    expect(seasonFor('2026-12-03')).toBe('normal')
    expect(seasonFor('')).toBe('normal')
  })
})

const fbComp = (name, avg) => ({ name, fb: { posts: 6, avgReactions: avg, avgComments: 1 } })
const igComp = (name, likes, plays) => ({ name, ig: { posts: 72, avgLikes: likes, reelPlays: plays } })

describe('computeBenchmarks', () => {
  test('averages the top three Facebook responders and takes the Instagram medians', () => {
    const b = computeBenchmarks([fbComp('a', 1000), fbComp('b', 200), fbComp('c', 100), fbComp('d', 10), igComp('x', 10, 100), igComp('y', 30, 300), igComp('z', 50, 900)])
    expect(b.fbTop3Avg).toBe(433)
    expect(b.fbBest).toEqual({ name: 'a', value: 1000 })
    expect(b.igLikesMedian).toBe(30)
    expect(b.reelPlaysMedian).toBe(300)
  })
  test('empty input gives neutral zeros instead of crashing', () => {
    const b = computeBenchmarks([])
    expect(b.fbTop3Avg).toBe(0)
    expect(b.fbBest).toBeNull()
  })
})

describe('recommendAd', () => {
  const bench = { fbTop3Avg: 150, fbBest: { name: 'المختبر', value: 1090 }, igLikesMedian: 5, reelPlaysMedian: 30000 }
  const mk = (over) => ({
    id: 'p', type: 'post', platform: 'facebook', date: '2026-12-10', headline: 'اطمّن', caption: 'خصم 15% على الباقات', panelService: 'باقة', ...over,
  })
  const base = (type, days, regions, date) => suggestBudget({ postType: type, goal: 'sales', days, regions, season: seasonFor(date) }).total

  test('stories are not funded, with a reason', () => {
    const r = recommendAd(mk({ type: 'story', platform: 'instagram' }), { category: 'general', benchmarks: bench })
    expect(r.ad.enabled).toBe(false)
    expect(r.reasons.join(' ')).toMatch(/استوري/)
  })

  test('an offer reel is funded for 5 days over priority and tier-2 branches', () => {
    const r = recommendAd(mk({ type: 'reel', platform: 'instagram' }), { category: 'general', benchmarks: bench })
    expect(r.ad.enabled).toBe(true)
    expect(r.ad.days).toBe(5)
    expect(r.ad.regions).toHaveLength(7)
    expect(r.ad.budget).toBe(base('reel', 5, r.ad.regions, '2026-12-10'))
    expect(validateAd(r.ad).ok).toBe(true)
  })

  test('Facebook posts are weighted by how strong competitor response is there (clamped 0.8-1.3)', () => {
    const regions = REGIONS.filter((x) => x.tier <= 2).map((x) => x.id)
    const strong = recommendAd(mk({}), { category: 'general', benchmarks: { ...bench, fbTop3Avg: 1000 } })
    expect(strong.ad.budget).toBe(Math.round((base('post', 5, regions, '2026-12-10') * 1.3) / 50) * 50)
    const weak = recommendAd(mk({}), { category: 'general', benchmarks: { ...bench, fbTop3Avg: 10 } })
    expect(weak.ad.budget).toBe(Math.round((base('post', 5, regions, '2026-12-10') * 0.8) / 50) * 50)
  })

  test('Instagram image posts get 0.8x because competitor response there is weak', () => {
    const regions = REGIONS.filter((x) => x.tier <= 2).map((x) => x.id)
    const r = recommendAd(mk({ platform: 'instagram' }), { category: 'general', benchmarks: bench })
    expect(r.ad.budget).toBe(Math.round((base('post', 5, regions, '2026-12-10') * 0.8) / 50) * 50)
  })

  test('without offer words it is an awareness push on the two priority branches only', () => {
    const r = recommendAd(mk({ caption: 'نصيحة صحية بسيطة', panelService: 'توعية' }), { category: 'general', benchmarks: bench })
    expect(r.ad.regions.sort()).toEqual(['التجمع الخامس', 'المهندسين'].sort())
  })

  test('audience follows the category and the reasons cite the real benchmark numbers', () => {
    const r = recommendAd(mk({}), { category: 'thyroid', benchmarks: bench })
    expect([r.ad.ageFrom, r.ad.ageTo, r.ad.gender]).toEqual([25, 50, 'female'])
    const text = r.reasons.join(' ')
    expect(text).toContain('150')
    expect(text).toContain('المختبر')
    expect(text).toMatch(/Ads Manager|تكلفة النتيجة/)
  })
})

describe('buildAdBrief', () => {
  test('lists everything needed to set the ad up in Ads Manager, in Arabic', () => {
    const ad = { enabled: true, budget: 1800, days: 5, regions: ['المهندسين', 'الدقي'], ageFrom: 28, ageTo: 50, gender: 'female' }
    const t = buildAdBrief({ headline: 'الجمعة الخضراء', platform: 'facebook', type: 'post', date: '2026-11-26', time: '21:00' }, ad)
    for (const s of ['الجمعة الخضراء', 'فيسبوك', '1800', '5', 'المهندسين، الدقي', '28', '50', 'ستات', '2026-11-26']) expect(t).toContain(s)
  })
  test('a disabled ad says it is not funded', () => {
    expect(buildAdBrief({ headline: 'x', platform: 'instagram', type: 'story', date: '2026-11-22', time: '18:00' }, { ...emptyAd() })).toMatch(/مش ممول/)
  })
})
