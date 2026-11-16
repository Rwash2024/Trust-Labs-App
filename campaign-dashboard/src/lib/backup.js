// Backup reminder: the whole plan lives in this browser only, so clearing site data erases it.
// We remember when the last export happened (separate key) and nag after a few days.

const KEY = 'campaign-dashboard-last-export'
const DAY = 24 * 60 * 60 * 1000
const MAX_AGE_DAYS = 3

export function getLastExport() {
  try {
    return globalThis.localStorage.getItem(KEY) || null
  } catch {
    return null
  }
}

export function markExported(now = Date.now()) {
  try {
    globalThis.localStorage.setItem(KEY, new Date(now).toISOString())
  } catch {
    // storage blocked: the reminder just keeps showing
  }
}

export function backupReminder({ lastExportAt, now = Date.now() }) {
  const t = lastExportAt ? Date.parse(lastExportAt) : NaN
  if (Number.isNaN(t) || t > now) {
    return 'لسه ماعملتش نسخة احتياطية. خطتك محفوظة في المتصفح ده بس، دوس "تصدير الملف" عشان ما تضيعش.'
  }
  const days = Math.floor((now - t) / DAY)
  if (days <= MAX_AGE_DAYS) return null
  return `آخر نسخة احتياطية من ${days} أيام. دوس "تصدير الملف" عشان تحفظ شغلك.`
}
