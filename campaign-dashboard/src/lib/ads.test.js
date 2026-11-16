import { REGIONS, emptyAd, validateAd, suggestAudience, suggestBudget, seasonFor } from './ads.js'

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
