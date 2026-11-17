// Dates from the database are UTC; the team reads Cairo time.
const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo', dateStyle: 'short', timeStyle: 'short' })

export function cairoStamp(iso) {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? '' : fmt.format(new Date(t))
}
