import { buildPlanCsv } from './csv.js'

const post = (over = {}) => ({
  id: 'p1', ideaId: 'i1', type: 'reel', platform: 'instagram', date: '2026-12-04', time: '21:00',
  headline: 'قلبك مش لعبة', caption: 'كابشن, فيه فاصلة', hashtags: ['#a', '#b'], panelService: 'خدمة',
  panelBullets: ['1', '2', '3', '4'], image: { concept: 'c', subject: 's', mood: 'm', accent: 'a' }, status: 'ready', ...over,
})
const ideas = [{ id: 'i1', text: 'حملة ضغط الدم', createdAt: '2026-11-16' }]

test('starts with a UTF-8 BOM so Excel reads Arabic, and has an Arabic header', () => {
  const csv = buildPlanCsv([], [])
  expect(csv.charCodeAt(0)).toBe(0xfeff)
  expect(csv).toContain('التاريخ')
  expect(csv.trim().split('\n')).toHaveLength(1)
})

test('quotes cells with commas, doubles quotes and keeps newlines inside quotes', () => {
  const csv = buildPlanCsv([post({ caption: 'قال "اطمّن"\nوبعدين, كمّل' })], ideas)
  expect(csv).toContain('"قال ""اطمّن""\nوبعدين, كمّل"')
})

test('rows are sorted by date and include idea text, type and status in Arabic', () => {
  const csv = buildPlanCsv([post({ id: 'b', date: '2026-12-10' }), post({ id: 'a', date: '2026-12-02' })], ideas)
  const lines = csv.split('\n').filter(Boolean)
  expect(lines[1]).toContain('2026-12-02')
  expect(lines[2]).toContain('2026-12-10')
  expect(csv).toContain('حملة ضغط الدم')
  expect(csv).toContain('ريلز')
  expect(csv).toContain('جاهز')
})

test('guards against spreadsheet formula injection', () => {
  const csv = buildPlanCsv([post({ headline: '=HYPERLINK("x")', caption: '+1', panelService: '@cmd' })], ideas)
  expect(csv).toContain("'=HYPERLINK")
  expect(csv).toContain("'+1")
  expect(csv).toContain("'@cmd")
})

test('a post whose idea is unknown still exports', () => {
  const csv = buildPlanCsv([post({ ideaId: 'zzz' })], ideas)
  expect(csv.split('\n').filter(Boolean)).toHaveLength(2)
})

test('ad settings are exported: funded flag, budget, regions, ages and gender in Arabic', () => {
  const ad = { enabled: true, budget: 850, days: 7, regions: ['المهندسين', 'الدقي'], ageFrom: 25, ageTo: 55, gender: 'female' }
  const csv = buildPlanCsv([post({ ad })], ideas)
  for (const s of ['ممول', 'الميزانية', 'المناطق', 'السن', 'الجنس', '850', 'المهندسين | الدقي', '25-55', 'ستات']) expect(csv).toContain(s)
})

test('a post without an ad exports empty ad cells', () => {
  const lines = buildPlanCsv([post()], ideas).split('\n').filter(Boolean)
  expect(lines[1]).toContain('لا')
})
