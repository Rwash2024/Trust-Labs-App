import { useEffect, useRef } from 'react'
import './TrackMap.css'

// Leaflet is loaded on demand so it ships as its own chunk.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '© OpenStreetMap'
const CAIRO = [30.05, 31.25]
const EMPTY = []
const HOME_COLOR = '#D85A30'
const TONE_COLORS = { warn: '#F59E0B', idle: '#6B7280' }
const BRAND_FALLBACK = '#39B76E'

function validPoint(p) {
  return (
    !!p &&
    typeof p.lat === 'number' &&
    typeof p.lng === 'number' &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  )
}

function brandGreen() {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    return v || BRAND_FALLBACK
  } catch {
    return BRAND_FALLBACK
  }
}

function iconFor(L, m) {
  const shadow = 'box-shadow:0 1px 4px rgba(0,0,0,.45)'
  let html
  if (m.kind === 'home') {
    html = `<span style="display:block;width:20px;height:20px;box-sizing:border-box;border-radius:50%;background:#fff;border:4px solid ${HOME_COLOR};${shadow}"></span>`
  } else {
    const color = TONE_COLORS[m.tone] || brandGreen()
    html = `<span style="display:block;width:20px;height:20px;box-sizing:border-box;border-radius:50%;background:${color};border:3px solid #fff;${shadow}"></span>`
  }
  return L.divIcon({ className: 'track-map-pin', html, iconSize: [20, 20], iconAnchor: [10, 10] })
}

export default function TrackMap({ markers = EMPTY, height = 260 }) {
  const box = useRef(null)
  const state = useRef({ L: null, map: null, layer: null })
  const markersRef = useRef(markers)
  const lastKey = useRef(null)

  const draw = () => {
    const { L, map, layer } = state.current
    if (!map) return
    const pts = markersRef.current.filter(validPoint)
    layer.clearLayers()
    for (const m of pts) {
      const pin = L.marker([m.lat, m.lng], { icon: iconFor(L, m), keyboard: false }).addTo(layer)
      if (m.label) {
        const el = document.createElement('span')
        el.textContent = String(m.label) // labels come from DB rows: never innerHTML
        pin.bindTooltip(el, { direction: 'top', offset: [0, -10], permanent: pts.length <= 3 })
      }
    }
    // Refit only when the set of markers changes, not on every GPS ping.
    const key = pts.map((m) => String(m.id)).sort().join('|')
    if (key === lastKey.current) return
    const el = box.current
    if (!el || !(el.clientWidth > 0) || !(el.clientHeight > 0)) return
    lastKey.current = key
    map.invalidateSize()
    if (!pts.length) map.setView(CAIRO, 10)
    else if (pts.length === 1) map.setView([pts[0].lat, pts[0].lng], 15)
    else map.fitBounds(pts.map((m) => [m.lat, m.lng]), { padding: [32, 32], maxZoom: 16 })
  }
  const drawRef = useRef(draw)

  // Keep the latest markers/draw reachable from the async init and resize callbacks.
  useEffect(() => {
    markersRef.current = markers
    drawRef.current = draw
    draw()
  }, [markers])

  // Create once (lazy leaflet), destroy on unmount.
  useEffect(() => {
    let cancelled = false
    let ro = null
    ;(async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')])
      if (cancelled || !box.current) return
      const map = L.map(box.current, { zoomControl: true, attributionControl: true })
      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map)
      const layer = L.layerGroup().addTo(map)
      state.current = { L, map, layer }
      map.setView(CAIRO, 10)
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => {
          map.invalidateSize()
          drawRef.current()
        })
        ro.observe(box.current)
      }
      drawRef.current()
    })()
    return () => {
      cancelled = true
      ro?.disconnect()
      state.current.map?.remove()
      state.current = { L: null, map: null, layer: null }
      lastKey.current = null
    }
  }, [])

  return <div ref={box} dir="ltr" className="track-map" style={{ height }} />
}
