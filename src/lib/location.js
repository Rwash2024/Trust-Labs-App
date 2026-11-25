// Helpers for the optional home-visit map pin (see components/LocationPicker.jsx).

export const MAX_LINK_LENGTH = 500
const GOOGLE_HOSTS = ['google.com', 'www.google.com', 'google.com.eg', 'www.google.com.eg']

export function mapsUrlFor(lat, lng) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`
}

// Returns an error message, or '' when the link is empty or acceptable.
export function locationLinkError(link) {
  const value = link.trim()
  if (!value) return ''
  if (value.length > MAX_LINK_LENGTH) return 'اللينك طويل جدًا'
  let url
  try {
    url = new URL(value)
  } catch {
    return 'ده مش لينك صحيح. انسخ لينك اللوكيشن من واتساب أو جوجل ماب'
  }
  if (url.protocol !== 'https:') return 'لازم اللينك يبدأ بـ https://'
  const host = url.hostname.toLowerCase()
  const path = url.pathname
  const isMaps =
    host === 'maps.app.goo.gl' ||
    host === 'maps.google.com' ||
    (host === 'goo.gl' && path.startsWith('/maps')) ||
    (GOOGLE_HOSTS.includes(host) && path.startsWith('/maps'))
  if (!isMaps) return 'اللينك لازم يكون لوكيشن من جوجل ماب'
  return ''
}
