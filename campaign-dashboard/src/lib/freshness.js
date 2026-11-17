// How old the competitor numbers are. They are a snapshot, so they go stale.

const DAY = 24 * 60 * 60 * 1000
export const FRESH_DAYS = 14
export const STALE_DAYS = 30

export function dataFreshness(pulledAt, now = Date.now()) {
  const t = pulledAt ? Date.parse(pulledAt) : NaN
  if (Number.isNaN(t) || t > now) {
    return { level: 'unknown', days: null, warning: 'مش معروف تاريخ سحب بيانات المنافسين، اعتبرها قديمة لحد ما تحدّثها.' }
  }
  const days = Math.floor((now - t) / DAY)
  if (days <= FRESH_DAYS) return { level: 'fresh', days, warning: null }
  if (days <= STALE_DAYS) {
    return { level: 'aging', days, warning: `بيانات المنافسين عمرها ${days} يوم. قرّبت تبقى قديمة، فكّر تحدّثها قريب.` }
  }
  return { level: 'stale', days, warning: `بيانات المنافسين عمرها ${days} يوم. حدّثها قبل ما تعتمد على أرقامها في الميزانيات.` }
}
