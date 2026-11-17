// What a feed shows before "more": an approximation, platforms change these limits.
import { normalizeArabic } from './similarity.js'

export const CAPTION_LIMITS = { instagram: 125, facebook: 250, tiktok: 100 }
const DEFAULT_LIMIT = 125
const CTA_WORDS = ['اسأل', 'اسألي', 'احجز', 'احجزي', 'اتصل', 'اتصلي', 'افحص', 'افحصي', 'اطمّن', 'اطمّني', 'اطمن', 'اطمني']

export function truncateCaption(text, platform) {
  const t = String(text ?? '')
  const limit = CAPTION_LIMITS[platform] ?? DEFAULT_LIMIT
  if (t.length <= limit) return { shown: t, truncated: false }
  let cut = t.slice(0, limit)
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > limit * 0.5) cut = cut.slice(0, lastSpace)
  return { shown: cut.trimEnd(), truncated: true }
}

const hasCta = (text) => {
  const n = normalizeArabic(text)
  return CTA_WORDS.some((w) => n.includes(normalizeArabic(w)))
}

// True when the caption has a call to action, but only after the point where "more" cuts it off.
export function ctaHidden(caption, platform) {
  const { shown, truncated } = truncateCaption(caption, platform)
  return truncated && hasCta(String(caption ?? '')) && !hasCta(shown)
}

const SHAPES = {
  story: { ratio: '9 / 16', showCaption: false, marker: 'story' },
  reel: { ratio: '9 / 16', showCaption: true, marker: 'play' },
  post: { ratio: '4 / 5', showCaption: true, marker: null },
  carousel: { ratio: '4 / 5', showCaption: true, marker: 'dots' },
}

export function previewShape(post) {
  return SHAPES[post?.type] ?? SHAPES.post
}
