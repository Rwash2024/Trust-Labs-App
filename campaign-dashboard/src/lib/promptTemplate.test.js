import { buildImagePrompt, validateBullets } from './promptTemplate.js'

const base = {
  concept: 'a human heart floating on an orange-white lifebuoy in a calm sea at sunset',
  subject: 'the heart on the lifebuoy',
  mood: 'warm golden sunset glow',
  accent: 'warm orange',
  serviceLine: 'أسأل عن باقة تحاليل ضغط الدم',
  bullets: ['صورة دم كاملة', 'باقة الكوليسترول', 'وظائف الكلى', 'الدهون'],
}

test('contains format, brand color, and the exact Arabic panel text', () => {
  const p = buildImagePrompt(base)
  for (const s of ['4:5', '1080x1350', '#39B76E', base.serviceLine, ...base.bullets]) expect(p).toContain(s)
})

test('never contains hotline, website or Arabic brand spelling, and forbids logos', () => {
  const p = buildImagePrompt(base)
  expect(p).not.toContain('16183')
  expect(p).not.toContain('trustlabseg')
  expect(p).not.toContain('تراست')
  expect(p).toContain('No logo')
})

test('keeps bottom 14% clear and only panel text allowed', () => {
  const p = buildImagePrompt(base)
  expect(p).toContain('bottom 14%')
  expect(p).toContain('ONLY text')
})

test('includes medical accuracy rules', () => {
  const p = buildImagePrompt(base)
  for (const s of ['blue disposable gloves', 'tourniquet', 'inner elbow', 'five fingers']) expect(p).toContain(s)
})

test('validateBullets accepts exactly 4 and rejects 3 or 5 with Arabic message', () => {
  expect(validateBullets(['a', 'b', 'c', 'd']).ok).toBe(true)
  for (const n of [3, 5]) {
    const r = validateBullets(Array(n).fill('x'))
    expect(r.ok).toBe(false)
    expect(r.message).toMatch(/[؀-ۿ]/)
  }
})
