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

  // Scrolls the carousel container directly (never scrollIntoView) — scrollIntoView
  // can nudge an ancestor's vertical scroll position too, which showed up as a stray
  // vertical scrollbar flash whenever the carousel advanced.
  const scrollToCard = (index, behavior) => {
    const container = containerRef.current
    const card = cardRefs.current[index]
    if (!container || !card) return
    const offset = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2
    container.scrollTo({ left: offset, behavior })
  }

  // Autoplay: advance to the next card every few seconds. Looping from the last
  // card back to the first jumps instantly (no animation) instead of smooth-scrolling
  // backward across the whole row, so the visible motion always reads as one
  // direction only.
  useEffect(() => {
    if (items.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = setInterval(() => {
      if (pausedRef.current) return
      const isWrapping = activeIndexRef.current === items.length - 1
      const nextIndex = (activeIndexRef.current + 1) % items.length
      scrollToCard(nextIndex, isWrapping ? 'auto' : 'smooth')
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
