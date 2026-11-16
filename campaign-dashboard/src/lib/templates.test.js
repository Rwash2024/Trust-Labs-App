import { detectCategory, fillPost, fillPosts } from './templates.js'

const empty = (over = {}) => ({
  id: 'x', ideaId: 'i', type: 'post', platform: 'instagram', date: '2026-12-02', time: '20:00',
  headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''],
  image: { concept: '', subject: '', mood: '', accent: '' }, status: 'idea', ...over,
})
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const BANNED = ['نضمن', 'مضمون', 'هيشفيك', 'علاج نهائي', '100%']

test.each([
  ['حملة ضغط الدم', 'heart'],
  ['قلبك والكوليسترول', 'heart'],
  ['تحاليل الغدة الدرقية', 'thyroid'],
  ['اليوم العالمي للسكر', 'diabetes'],
  ['فحص NIPT للحمل', 'pregnancy'],
  ['فحص ما قبل الزواج', 'general'],
])('detectCategory(%s) = %s', (idea, cat) => {
  expect(detectCategory(idea)).toBe(cat)
})

test('fillPost fills every empty field with valid content', () => {
  const p = fillPost(empty(), 'حملة ضغط الدم', 0)
  expect(p.headline.length).toBeGreaterThan(0)
  expect(words(p.headline)).toBeLessThanOrEqual(3)
  expect(p.caption.length).toBeGreaterThan(10)
  expect(p.panelService.length).toBeGreaterThan(3)
  expect(p.panelBullets).toHaveLength(4)
  p.panelBullets.forEach((b) => expect(b.length).toBeGreaterThan(1))
  expect(p.hashtags.length).toBeGreaterThanOrEqual(4)
  p.hashtags.forEach((h) => expect(h.startsWith('#')).toBe(true))
  for (const k of ['concept', 'subject', 'mood', 'accent']) expect(p.image[k].length).toBeGreaterThan(2)
})

test('fillPost never overwrites what Mohamed already wrote', () => {
  const p = fillPost(empty({ headline: 'عنواني', caption: 'كابشني', panelBullets: ['أ', 'ب', 'ج', 'د'] }), 'حملة ضغط الدم', 3)
  expect(p.headline).toBe('عنواني')
  expect(p.caption).toBe('كابشني')
  expect(p.panelBullets).toEqual(['أ', 'ب', 'ج', 'د'])
})

test('fillPost never promises results', () => {
  for (let i = 0; i < 12; i++) {
    const p = fillPost(empty(), 'حملة ضغط الدم', i)
    for (const w of BANNED) expect(p.caption + p.headline).not.toContain(w)
  }
})

test('fillPosts gives different headlines and concepts to the first posts (no overlapping ideas)', () => {
  const posts = Array.from({ length: 6 }, (_, i) => empty({ id: `p${i}` }))
  const out = fillPosts(posts, 'حملة ضغط الدم')
  expect(new Set(out.map((p) => p.headline)).size).toBe(6)
  expect(new Set(out.map((p) => p.image.concept)).size).toBe(6)
})

test('fillPosts leaves already filled posts and the count untouched', () => {
  const posts = [empty({ id: 'a', headline: 'جاهز', caption: 'جاهز', panelService: 'جاهز', panelBullets: ['1', '2', '3', '4'], hashtags: ['#a', '#b', '#c', '#d'], image: { concept: 'c', subject: 's', mood: 'm', accent: 'a' } }), empty({ id: 'b' })]
  const out = fillPosts(posts, 'حملة ضغط الدم')
  expect(out).toHaveLength(2)
  expect(out[0]).toEqual(posts[0])
  expect(out[1].headline.length).toBeGreaterThan(0)
})

test('unknown ideas fall back to general content and never crash', () => {
  const p = fillPost(empty(), '', 0)
  expect(p.headline.length).toBeGreaterThan(0)
  expect(p.panelBullets).toHaveLength(4)
})
