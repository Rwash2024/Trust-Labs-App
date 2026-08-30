import { useEffect, useRef, useState } from 'react'
import './BannerCarousel.css'

// Full-width snap-scroll carousel with dot pagination, shared by the Home page's
// "تحاليل مميزة" section and the Packages page's packages carousel so both move
// identically. `renderItem(item, index, cardRef)` must attach `cardRef` to the
// scrollable card element for the dot-tracking IntersectionObserver to work.
export default function BannerCarousel({ items, keyFn, renderItem }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const cardRefs = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveIndex(cardRefs.current.indexOf(visible.target))
      },
      { threshold: 0.6 }
    )
    cardRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [items])

  return (
    <>
      <div className="banner-carousel">
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
