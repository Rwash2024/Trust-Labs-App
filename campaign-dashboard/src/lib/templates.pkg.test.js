import { fillPost, fillPosts } from './templates.js'
import { checkPost } from './strength.js'
import { checkAdCopy } from './adCompliance.js'
import { MAX_PACKAGE_NAME } from './pkg.js'

const empty = (over = {}) => ({
  id: 'x', ideaId: 'i', type: 'post', platform: 'instagram', date: '2026-12-02', time: '20:00',
  headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''],
  image: { concept: '', subject: '', mood: '', accent: '' }, status: 'idea', ...over,
})
const TYPES = ['post', 'reel', 'carousel', 'story']
const IDEAS = ['حملة ضغط الدم', 'فحص ما قبل الزواج', 'عروض الشتاء', 'تحاليل الأطفال', 'دلالات الأورام', 'فحص دوري شامل']
const PKG = { name: 'باقة الشتاء', price: 1200 }

test('the package name and price go into the panel service line and the caption', () => {
  const p = fillPost(empty(), 'عروض الشتاء', 0, PKG)
  expect(p.panelService).toContain('باقة الشتاء')
  expect(p.panelService).toMatch(/1,200/)
  expect(p.caption).toContain('باقة الشتاء')
  expect(p.caption).toMatch(/1,200/)
})

test('a package without a price shows the name only, no "جنيه"', () => {
  const p = fillPost(empty(), 'عروض الشتاء', 0, { name: 'باقة الشتاء', price: null })
  expect(p.panelService).toContain('باقة الشتاء')
  expect(p.panelService + p.caption).not.toContain('جنيه')
})

test('without a package the output is exactly what it was before', () => {
  const a = fillPost(empty(), 'حملة ضغط الدم', 2)
  const b = fillPost(empty(), 'حملة ضغط الدم', 2, null)
  expect(b).toEqual(a)
  expect(a.panelService).not.toContain('جنيه')
})

test('a package never overwrites a service line he already wrote', () => {
  const p = fillPost(empty({ panelService: 'خدمتي' }), 'عروض الشتاء', 0, PKG)
  expect(p.panelService).toBe('خدمتي')
})

test('with a package every category and post type still passes strength rules and the wording check', () => {
  for (const idea of IDEAS) {
    for (const type of TYPES) {
      for (let i = 0; i < 8; i++) {
        const p = fillPost(empty({ type }), idea, i, PKG)
        expect(checkPost(p).tips, `${idea} ${type} #${i}`).toEqual([])
        expect(checkAdCopy(p).issues, `${idea} ${type} #${i}`).toEqual([])
      }
    }
  }
})

test('even the longest allowed package name keeps captions inside the limits (stories 30-90, others up to 220)', () => {
  const long = { name: 'ب'.repeat(MAX_PACKAGE_NAME), price: 999999 }
  for (const idea of IDEAS) {
    for (let i = 0; i < 8; i++) {
      const story = fillPost(empty({ type: 'story' }), idea, i, long).caption
      expect(story.length, `${idea} story #${i}`).toBeLessThanOrEqual(90)
      expect(story.length).toBeGreaterThanOrEqual(30)
      expect(fillPost(empty(), idea, i, long).caption.length, `${idea} post #${i}`).toBeLessThanOrEqual(220)
    }
  }
})

test('fillPosts passes the package to every post', () => {
  const out = fillPosts([empty({ id: 'a' }), empty({ id: 'b' })], 'عروض الشتاء', PKG)
  for (const p of out) expect(p.panelService).toContain('باقة الشتاء')
})
