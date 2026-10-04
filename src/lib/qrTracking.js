// In-branch QR codes open the app with ?b=<branch slug>&p=<placement>. This
// records the scan (once per device per branch+placement per day), remembers
// the branch for this visit so the rate-visit page can offer it first, and
// strips the params so a reload or a shared link isn't counted again.
import { supabase } from './supabase'
import { trackEvent } from './analytics'
import { BRANCH_SLUGS, QR_PLACEMENTS } from '@client/data/branchSlugs'

const DEVICE_KEY = 'tl_device_id'
const QR_BRANCH_KEY = 'tl_qr_branch'

function safeGet(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value)
  } catch {
    // private mode / storage blocked — tracking still works, just without dedupe
  }
}

function deviceId() {
  let id = safeGet(localStorage, DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    safeSet(localStorage, DEVICE_KEY, id)
  }
  return id
}

// The branch the patient scanned a code in during this visit (Arabic name), or null.
export function qrBranchName() {
  const slug = safeGet(sessionStorage, QR_BRANCH_KEY)
  return (slug && BRANCH_SLUGS[slug]) || null
}

// Call once, before the router reads the URL.
export function captureQrScanFromUrl() {
  const url = new URL(window.location.href)
  const branch = url.searchParams.get('b')
  const placement = url.searchParams.get('p')
  if (!branch && !placement) return

  url.searchParams.delete('b')
  url.searchParams.delete('p')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)

  if (!BRANCH_SLUGS[branch] || !QR_PLACEMENTS[placement]) return
  safeSet(sessionStorage, QR_BRANCH_KEY, branch)

  const day = new Date().toISOString().slice(0, 10)
  const dedupeKey = `tl_qr_${branch}_${placement}_${day}`
  if (safeGet(localStorage, dedupeKey)) return
  safeSet(localStorage, dedupeKey, '1')

  trackEvent('qr_scan', { branch, placement })
  if (!supabase) return
  supabase
    .from('qr_scans')
    .insert({ branch, placement, path: url.pathname, device_id: deviceId() })
    .then(({ error }) => error && console.error('recording QR scan failed', error))
}
