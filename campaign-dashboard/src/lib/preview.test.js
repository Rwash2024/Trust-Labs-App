import { truncateCaption, ctaHidden, previewShape, CAPTION_LIMITS } from './preview.js'

const long = (n) => ('كلمة '.repeat(Math.ceil(n / 5))).trim().slice(0, n)

test('a caption under the limit is shown whole', () => {
  expect(truncateCaption('كابشن قصير', 'instagram')).toEqual({ shown: 'كابشن قصير', truncated: false })
})

test('a long instagram caption is cut near the limit, at a word boundary', () => {
  const text = long(400)
  const r = truncateCaption(text, 'instagram')
  expect(r.truncated).toBe(true)
  expect(r.shown.length).toBeLessThanOrEqual(CAPTION_LIMITS.instagram)
  expect(text.startsWith(r.shown)).toBe(true)
  expect(r.shown.endsWith(' ')).toBe(false)
})

test('facebook shows more text than instagram; unknown platforms fall back to a default', () => {
  expect(CAPTION_LIMITS.facebook).toBeGreaterThan(CAPTION_LIMITS.instagram)
  expect(truncateCaption(long(400), 'tiktok').truncated).toBe(true)
  expect(truncateCaption(long(400), 'weird').shown.length).toBeGreaterThan(0)
})

test('the call to action is reported hidden only when it comes after the cut', () => {
  const early = `احجز دلوقتي. ${long(300)}`
  const late = `${long(300)} احجز دلوقتي`
  expect(ctaHidden(early, 'instagram')).toBe(false)
  expect(ctaHidden(late, 'instagram')).toBe(true)
  expect(ctaHidden('كابشن قصير من غير دعوة', 'instagram')).toBe(false)
})

test('shape follows the post type: stories and reels are tall, posts and carousels are 4:5', () => {
  expect(previewShape({ type: 'story' })).toMatchObject({ ratio: '9 / 16', showCaption: false, marker: 'story' })
  expect(previewShape({ type: 'reel' })).toMatchObject({ ratio: '9 / 16', showCaption: true, marker: 'play' })
  expect(previewShape({ type: 'post' })).toMatchObject({ ratio: '4 / 5', showCaption: true, marker: null })
  expect(previewShape({ type: 'carousel' })).toMatchObject({ ratio: '4 / 5', showCaption: true, marker: 'dots' })
  expect(previewShape({ type: 'nonsense' }).ratio).toBe('4 / 5')
})
