const GA_ID = import.meta.env.VITE_GA_ID

let initialized = false

function ensureInit() {
  if (initialized || !GA_ID) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // send_page_view: false — we send pageviews manually on route change (PWA client-side nav)
  window.gtag('config', GA_ID, { send_page_view: false })
  initialized = true
}

export function trackPageview(path) {
  if (!GA_ID) return
  ensureInit()
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function trackEvent(name, params = {}) {
  if (!GA_ID) return
  ensureInit()
  window.gtag('event', name, params)
}

// Canonical event names for the key actions we track across the app.
export const AnalyticsEvents = {
  BOOKING_STARTED: 'booking_form_started',
  BOOKING_COMPLETED: 'booking_form_completed',
  RESULTS_VIEWED: 'test_results_viewed',
  BRANCH_VIEWED: 'branch_location_viewed',
  TRUST_CARD_VIEWED: 'trust_card_viewed',
}
