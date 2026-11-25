// Location source for the chemist trip screen.
//
// createLocationSource({ onFix, onError }) -> { kind, start(), stop() }
// - onFix({ lat, lng, accuracy, at }) is called at most once per 20 s.
// - onError(err) gets GeolocationPositionError-like objects ({ code, message });
//   code 1 = permission denied. Watching continues after errors.
//
// Inside the Android app (Capacitor) a native background source will be used;
// in the browser we use watchPosition + Screen Wake Lock.

export const FIX_INTERVAL_MS = 20000
const HEARTBEAT_MS = 30000

const GEO_OPTIONS = { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }

function isNative() {
  try {
    return !!window.Capacitor?.isNativePlatform?.()
  } catch {
    return false
  }
}

// Which source createLocationSource will use: 'browser' | 'native'.
export function locationSourceKind() {
  // TODO(Plan 2): return 'native' when isNative() once the native source exists.
  return 'browser'
}

export function createLocationSource({ onFix, onError }) {
  if (isNative()) {
    // TODO(Plan 2): native background location via
    // @capacitor-community/background-geolocation (foreground-service
    // notification «جاري مشاركة موقعك مع العميل»). Until then the Android app
    // uses the browser source below.
    return createBrowserSource({ onFix, onError })
  }
  return createBrowserSource({ onFix, onError })
}

function createBrowserSource({ onFix, onError }) {
  let watchId = null
  let running = false
  let lastEmitAt = 0
  let pending = null
  let trailingTimer = null
  let heartbeatTimer = null
  let wakeLock = null

  const safe = (fn, ...args) => {
    try {
      fn?.(...args)
    } catch {
      // a listener error must not stop the source
    }
  }

  const emit = (fix) => {
    lastEmitAt = Date.now()
    pending = null
    safe(onFix, fix)
  }

  // Throttle: first fix right away, then one per FIX_INTERVAL_MS; the newest
  // fix inside a window is sent when the window ends.
  const handleFix = (fix) => {
    if (!running) return
    const wait = FIX_INTERVAL_MS - (Date.now() - lastEmitAt)
    if (wait <= 0) {
      emit(fix)
      return
    }
    pending = fix
    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        trailingTimer = null
        if (running && pending) emit(pending)
      }, wait)
    }
  }

  const onPosition = (pos) =>
    handleFix({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
      at: new Date(pos.timestamp || Date.now()).toISOString(),
    })

  const onPositionError = (err) => {
    if (!running) return
    safe(onError, { code: err?.code ?? 0, message: err?.message ?? '' })
  }

  const requestWakeLock = async () => {
    if (!running || wakeLock || !navigator.wakeLock?.request) return
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener?.('release', () => {
        wakeLock = null
      })
      if (!running) releaseWakeLock()
    } catch {
      // denied (low battery, not visible...) — retried on next visibility change
      wakeLock = null
    }
  }

  const releaseWakeLock = () => {
    const lock = wakeLock
    wakeLock = null
    lock?.release?.().catch?.(() => {})
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') requestWakeLock()
  }

  return {
    kind: 'browser',
    start() {
      if (running) return
      running = true
      // lastEmitAt is kept across stop/start so a restart can't send early.
      if (!navigator.geolocation) {
        safe(onError, { code: 2, message: 'geolocation unavailable' })
      } else {
        watchId = navigator.geolocation.watchPosition(onPosition, onPositionError, GEO_OPTIONS)
        // watchPosition may go quiet while standing still; ask directly then.
        heartbeatTimer = setInterval(() => {
          if (running && Date.now() - lastEmitAt >= HEARTBEAT_MS) {
            navigator.geolocation.getCurrentPosition(onPosition, onPositionError, GEO_OPTIONS)
          }
        }, HEARTBEAT_MS)
      }
      document.addEventListener('visibilitychange', onVisibility)
      requestWakeLock()
    },
    stop() {
      running = false
      if (watchId !== null) navigator.geolocation?.clearWatch(watchId)
      watchId = null
      clearTimeout(trailingTimer)
      trailingTimer = null
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
      pending = null
      document.removeEventListener('visibilitychange', onVisibility)
      releaseWakeLock()
    },
  }
}
