import { validateAd } from './ads.js'

const KEY = 'campaign-dashboard-db'
export const TYPES = ['post', 'reel', 'carousel', 'story']
export const PLATFORMS = ['facebook', 'instagram', 'tiktok']
const STATUSES = ['idea', 'ready', 'published']

export function emptyDb() {
  return {
    schemaVersion: 1,
    posts: [],
    ideas: [],
    settings: {
      platforms: ['facebook', 'instagram'],
      timesByPlatform: { facebook: ['19:00'], instagram: ['20:00'] },
    },
  }
}

const isStr = (v) => typeof v === 'string'

function validPost(p) {
  return (
    p && isStr(p.id) && isStr(p.ideaId) && TYPES.includes(p.type) && PLATFORMS.includes(p.platform) &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) && isStr(p.time) && isStr(p.headline) && isStr(p.caption) &&
    Array.isArray(p.hashtags) && isStr(p.panelService) && Array.isArray(p.panelBullets) &&
    p.image && isStr(p.image.concept) && isStr(p.image.subject) && isStr(p.image.mood) && isStr(p.image.accent) &&
    STATUSES.includes(p.status) &&
    (p.ad === undefined || validateAd(p.ad).ok)
  )
}

function checkDb(db) {
  if (!db || typeof db !== 'object') return 'الملف مش بالشكل المتوقع.'
  if (db.schemaVersion !== 1) return 'إصدار الملف غير مدعوم (المتوقع 1).'
  if (!Array.isArray(db.posts) || !Array.isArray(db.ideas) || !db.settings) return 'الملف ناقص بيانات أساسية.'
  const bad = db.posts.findIndex((p) => !validPost(p))
  if (bad !== -1) return `المنشور رقم ${bad + 1} في الملف فيه بيانات غلط.`
  return null
}

export function loadDb() {
  try {
    const raw = globalThis.localStorage.getItem(KEY)
    if (!raw) return emptyDb()
    const db = JSON.parse(raw)
    return checkDb(db) ? emptyDb() : db
  } catch {
    return emptyDb()
  }
}

export function saveDb(db) {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(db))
    return true
  } catch {
    return false
  }
}

export function exportDb(db) {
  return JSON.stringify(db, null, 2)
}

export function importDb(text) {
  let db
  try {
    db = JSON.parse(text)
  } catch {
    return { ok: false, error: 'الملف مش JSON سليم.' }
  }
  const error = checkDb(db)
  return error ? { ok: false, error } : { ok: true, db }
}
