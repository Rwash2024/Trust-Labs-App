import { useEffect, useRef, useState } from 'react'
import './BannerCarousel.css'

const AUTOPLAY_INTERVAL_MS = 4000
const RESUME_AFTER_INTERACTION_MS = 6000

// Full-width snap-scroll carousel with dot pagination and autoplay, shared by the
// Home page's "تحاليل مميزة" section and the Packages page's packages carousel so
// both move identically. `renderItem(item, index, cardRef)` must attach `cardRef`
// to the scrollable card element for the dot-tracking IntersectionObserver to work.
export default function BannerCarousel({ items, keyFn, renderItem }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const cardRefs = useRef([])
  const activeIndexRef = useRef(0)
  const containerRef = useRef(null)
  const pausedRef = useRef(false)
  const resumeTimeoutRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) {
          const index = cardRefs.current.indexOf(visible.target)
          setActiveIndex(index)
          activeIndexRef.current = index
        }
      },
      { threshold: 0.6 }
    )
    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  // Autoplay: advance to the next card every few seconds, looping back to the
  // start. Pauses while the user is actively swiping/scrolling the carousel.
  useEffect(() => {
    if (items.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = setInterval(() => {
      if (pausedRef.current) return
      const nextIndex = (activeIndexRef.current + 1) % items.length
      cardRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, AUTOPLAY_INTERVAL_MS)

    return () => clearInterval(id)
  }, [items])

  const pauseAutoplay = () => {
    pausedRef.current = true
    clearTimeout(resumeTimeoutRef.current)
    resumeTimeoutRef.current = setTimeout(() => {
      pausedRef.current = false
    }, RESUME_AFTER_INTERACTION_MS)
  }

  useEffect(() => () => clearTimeout(resumeTimeoutRef.current), [])

  return (
    <>
      <div
        ref={containerRef}
        className="banner-carousel"
        onPointerDown={pauseAutoplay}
        onTouchStart={pauseAutoplay}
        onWheel={pauseAutoplay}
      >
        {items.map((item, index) => renderItem(item, index, (el) => (cardRefs.current[index] = el)))}
      </div>
      {items.length > 1 && (
        <div className="banner-carousel__dots">
          {items.map((item, index) => (
            <span key={keyFn(item)} className={`banner-carousel__dot${index === activeIndex ? ' active' : ''}`} />
          ))}
        </div>
      )}
    </>
  )
}
