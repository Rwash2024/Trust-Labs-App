import { checkAdCopy } from './adCompliance.js'

const base = { headline: 'اطمّن على صحتك', caption: 'زيارة منزلية مجانية في الجمعة الخضراء. اسأل واحجز.', panelService: 'باقات الاطمئنان', panelBullets: ['سحب في بيتك', 'نتيجة أونلاين', 'ممرض بجوانتي', 'احجز دلوقتي'] }
const withText = (over) => ({ ...base, ...over })
const ids = (post) => checkAdCopy(post).issues.map((i) => i.id)

test('clean copy has no issues', () => {
  expect(checkAdCopy(base).issues).toEqual([])
})

test('claims a cure, healing or definitive diagnosis are flagged', () => {
  expect(ids(withText({ caption: 'تحليل بيشفيك من السكر' }))).toContain('claim')
  expect(ids(withText({ caption: 'علاج السكر من أول تحليل' }))).toContain('claim')
  expect(ids(withText({ headline: 'تشخيص نهائي' }))).toContain('claim')
})

test('talking to the reader about a condition they have is flagged (Meta personal-attributes rule)', () => {
  expect(ids(withText({ caption: 'عندك سكر؟ اعمل تحليل' }))).toContain('personal')
  expect(ids(withText({ caption: 'بتعاني من الضغط؟ اسأل واحجز' }))).toContain('personal')
  expect(ids(withText({ caption: 'السكر من أكتر الأمراض انتشارًا' }))).not.toContain('personal')
})

test('fear wording is flagged', () => {
  expect(ids(withText({ caption: 'ممكن تموت لو ما اتحاليتش' }))).toContain('fear')
  expect(ids(withText({ caption: 'مرض خطير بيهددك' }))).toContain('fear')
})

test('before-and-after wording is flagged', () => {
  expect(ids(withText({ caption: 'شوف الفرق قبل وبعد' }))).toContain('beforeafter')
})

test('a discount above the agreed 15% needs new approval; 15% and 10% do not', () => {
  expect(ids(withText({ caption: 'خصم 20% على الباقات' }))).toContain('discount')
  expect(ids(withText({ caption: '25% خصم على الباقات' }))).toContain('discount')
  expect(ids(withText({ caption: 'خصم 15% على الباقات' }))).not.toContain('discount')
  expect(ids(withText({ caption: 'خصم 10% على الباقات' }))).not.toContain('discount')
})

test('a "100%" that is not a discount is not read as one', () => {
  expect(ids(withText({ caption: 'نتيجة دقيقة 100%' }))).not.toContain('discount')
})

test('every issue has an Arabic message and the text is read from headline, caption and panel', () => {
  const r = checkAdCopy(withText({ panelBullets: ['علاج نهائي', 'a', 'b', 'c'] }))
  expect(r.issues.length).toBeGreaterThan(0)
  for (const i of r.issues) expect(i.message).toMatch(/[؀-ۿ]/)
})

test('missing fields never throw', () => {
  expect(() => checkAdCopy({})).not.toThrow()
  expect(checkAdCopy({}).issues).toEqual([])
})
