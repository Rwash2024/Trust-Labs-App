import { suggestAudience } from './ads.js'

test.each([
  ['vitamins', 22, 55, 'female'],
  ['liver', 35, 65, 'all'],
  ['allergy', 25, 50, 'all'],
  ['hormones', 22, 40, 'female'],
  ['sports', 20, 40, 'all'],
  ['premarital', 22, 35, 'all'],
  ['tumors', 35, 65, 'all'],
  ['kids', 25, 45, 'female'],
  ['bones', 45, 65, 'all'],
  ['seasonal', 25, 55, 'all'],
])('%s has its own audience (%i-%i %s), not the generic one', (cat, from, to, gender) => {
  const a = suggestAudience(cat)
  expect([a.ageFrom, a.ageTo, a.gender]).toEqual([from, to, gender])
  expect(a.why.length).toBeGreaterThan(5)
})

test('every audience respects the ad limits (18-65)', () => {
  for (const cat of ['vitamins', 'liver', 'allergy', 'hormones', 'sports', 'premarital', 'tumors', 'kids', 'bones', 'seasonal']) {
    const a = suggestAudience(cat)
    expect(a.ageFrom).toBeGreaterThanOrEqual(18)
    expect(a.ageTo).toBeLessThanOrEqual(65)
  }
})
