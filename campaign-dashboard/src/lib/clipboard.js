// Copy with a fallback for pages where navigator.clipboard is unavailable (file://, denied permission).
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return { ok: true, fallback: false }
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return { ok: !!ok, fallback: true }
  } catch {
    return { ok: false, fallback: true }
  }
}
