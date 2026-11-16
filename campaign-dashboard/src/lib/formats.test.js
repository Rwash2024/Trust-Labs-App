import { buildFormatPlan } from './formats.js'

const post = (type, over = {}) => ({
  id: 'p', ideaId: 'i', type, platform: 'instagram', date: '2026-12-02', time: '20:00',
  headline: 'أنقذ قلبك', caption: 'كابشن', hashtags: ['#a'], panelService: 'أسأل عن باقة تحاليل القلب والضغط',
  panelBullets: ['صورة دم كاملة', 'باقة الكوليسترول', 'وظائف الكلى', 'الدهون'],
  image: { concept: 'c', subject: 's', mood: 'm', accent: 'a' }, status: 'idea', ...over,
})
const BANNED = ['نضمن', 'مضمون', 'هيشفيك', '100%']

test('a plain post has no extra format plan', () => {
  expect(buildFormatPlan(post('post'))).toBeNull()
})

test('reel plan has timed steps starting with the hook and ending with the call to action', () => {
  const plan = buildFormatPlan(post('reel'))
  expect(plan.title).toContain('ريل')
  expect(plan.steps).toHaveLength(4)
  expect(plan.steps[0]).toMatch(/^0-3/)
  expect(plan.steps[0]).toContain('أنقذ قلبك')
  expect(plan.steps[3]).toContain('16183')
  expect(plan.steps[1] + plan.steps[2]).toContain('صورة دم كاملة')
})

test('story plan has 3 frames and uses a poll sticker', () => {
  const plan = buildFormatPlan(post('story'))
  expect(plan.title).toContain('استوري')
  expect(plan.steps).toHaveLength(3)
  expect(plan.steps[0]).toContain('استطلاع')
  expect(plan.steps[2]).toContain('16183')
})

test('carousel plan has cover, one slide per bullet, and a closing slide', () => {
  const plan = buildFormatPlan(post('carousel'))
  expect(plan.steps).toHaveLength(6)
  expect(plan.steps[0]).toContain('الغلاف')
  expect(plan.steps[0]).toContain('أنقذ قلبك')
  for (let i = 0; i < 4; i++) expect(plan.steps[i + 1]).toContain(post('carousel').panelBullets[i])
  expect(plan.steps[5]).toContain('16183')
})

test('empty bullets and headline do not crash and never promise results', () => {
  for (const type of ['reel', 'story', 'carousel']) {
    const plan = buildFormatPlan(post(type, { headline: '', panelBullets: ['', '', '', ''], panelService: '' }))
    expect(plan.steps.length).toBeGreaterThan(0)
    const all = plan.steps.join(' ')
    expect(all).not.toContain('undefined')
    for (const w of BANNED) expect(all).not.toContain(w)
  }
})
