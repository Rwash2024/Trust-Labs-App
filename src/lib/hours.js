const prettyTime = (s) =>
  s.replace(/(\d+)\s*ص/g, '$1 صباحًا').replace(/(\d+)\s*م/g, '$1 مساءً').replace(/ - /g, ' – ')

// "السبت - الخميس: 8ص - 11م | الجمعة: إجازة" -> [['السبت – الخميس', '8 صباحًا – 11 مساءً'], ['الجمعة', 'إجازة']]
// A part without "label:" becomes [null, text].
export function parseHours(hours = '') {
  return hours
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(':')
      return i < 0
        ? [null, prettyTime(part)]
        : [part.slice(0, i).replace(/ - /g, ' – '), prettyTime(part.slice(i + 1).trim())]
    })
}
