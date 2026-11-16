import { checkPost } from './strength.js'
import { fillPost } from './templates.js'

const good = () => ({
  id: 'p', ideaId: 'i', type: 'post', platform: 'instagram', date: '2026-12-02', time: '20:00',
  headline: 'أنقذ قلبك',
  caption: 'قلبك بيشتغل 24 ساعة من غير إجازة. اطمّن عليه بتحاليل بسيطة قبل ما يتعب، واسأل عن باقة تحاليل القلب والضغط.',
  hashtags: ['#a', '#b', '#c', '#d', '#e'],
  panelService: 'أسأل عن باقة تحاليل القلب والضغط',
  panelBullets: ['صورة دم كاملة', 'باقة الكوليسترول', 'وظائف الكلى', 'الدهون'],
  image: { concept: 'a realistic human heart floating on a lifebuoy in a calm sea', subject: 's', mood: 'm', accent: 'a' },
  status: 'idea',
})

test('a complete, safe post scores 100 with no tips', () => {
  const r = checkPost(good())
  expect(r.score).toBe(100)
  expect(r.tips).toEqual([])
})

test('an empty post scores low and tells what to fix', () => {
  const r = checkPost({ ...good(), headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''], image: { concept: '', subject: '', mood: '', accent: '' } })
  expect(r.score).toBeLessThan(20)
  expect(r.tips.length).toBeGreaterThanOrEqual(5)
})

test('a long headline loses points', () => {
  const r = checkPost({ ...good(), headline: 'واحد اتنين تلاتة اربعة خمسة' })
  expect(r.score).toBeLessThan(100)
  expect(r.tips.join(' ')).toContain('العنوان')
})

test('caption without a call to action is flagged', () => {
  const r = checkPost({ ...good(), caption: 'قلبك بيشتغل 24 ساعة من غير إجازة ويستاهل كل اهتمام وعناية منك دايمًا.' })
  expect(r.checks.find((c) => c.id === 'cta').ok).toBe(false)
})

test('promise words are a hard violation and are flagged', () => {
  const r = checkPost({ ...good(), caption: 'نضمن لك نتيجة مضمونة، واسأل عن الباقة دلوقتي وبسرعة كبيرة جدًا.' })
  expect(r.checks.find((c) => c.id === 'safe').ok).toBe(false)
  expect(r.tips.join(' ')).toContain('وعد')
})

test('hashtag count outside 4-8 is flagged', () => {
  expect(checkPost({ ...good(), hashtags: ['#a'] }).checks.find((c) => c.id === 'tags').ok).toBe(false)
  expect(checkPost({ ...good(), hashtags: Array.from({ length: 12 }, (_, i) => `#t${i}`) }).checks.find((c) => c.id === 'tags').ok).toBe(false)
})

test('score never leaves 0-100', () => {
  for (const over of [{}, { headline: '', caption: 'نضمن' }, { hashtags: [] }]) {
    const r = checkPost({ ...good(), ...over })
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(r.score).toBeLessThanOrEqual(100)
  }
})

test('auto-filled drafts from every category and slot pass the checklist (>= 85)', () => {
  const blank = () => ({ ...good(), headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''], image: { concept: '', subject: '', mood: '', accent: '' } })
  for (const idea of ['حملة ضغط الدم', 'الغدة الدرقية', 'اليوم العالمي للسكر', 'فحص NIPT للحمل', 'فحص عام']) {
    for (let i = 0; i < 7; i++) expect(checkPost(fillPost(blank(), idea, i)).score).toBeGreaterThanOrEqual(85)
  }
})
