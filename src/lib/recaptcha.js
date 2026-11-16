// reCAPTCHA v3 token for the Formspree booking forms.
// Fails open on purpose: if the site key is missing, the script is blocked, or anything throws,
// getToken() resolves to null and the form is submitted exactly as it was before.

const withTimeout = (promise, ms) => {
  let timer
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve(null), ms) })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export function createRecaptcha({ siteKey, win = globalThis.window, doc = globalThis.document, timeoutMs = 8000 } = {}) {
  let loading = null

  // Loads Google's script once. The floating badge is hidden; the form shows the required legal notice instead.
  function load() {
    if (loading) return loading
    loading = new Promise((resolve) => {
      try {
        const style = doc.createElement('style')
        style.textContent = '.grecaptcha-badge{visibility:hidden}'
        doc.head.appendChild(style)
        const script = doc.createElement('script')
        script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`
        script.async = true
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        doc.head.appendChild(script)
      } catch {
        resolve(false)
      }
    })
    return loading
  }

  async function getToken(action = 'submit') {
    if (!siteKey) return null
    try {
      const loaded = await withTimeout(load(), timeoutMs)
      if (!loaded || !win?.grecaptcha) return null
      const token = await withTimeout(
        new Promise((resolve, reject) => {
          win.grecaptcha.ready(() => {
            win.grecaptcha.execute(siteKey, { action }).then(resolve, reject)
          })
        }),
        timeoutMs,
      )
      return token || null
    } catch {
      return null
    }
  }

  return { enabled: Boolean(siteKey), getToken }
}

export const recaptcha = createRecaptcha({ siteKey: import.meta.env?.VITE_RECAPTCHA_SITE_KEY })
