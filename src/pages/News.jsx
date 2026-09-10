import { useEffect, useState } from 'react'
import { fetchNews } from '../lib/data'
import { NewsIcon } from '../components/icons'
import './News.css'

function NewsCard({ item }) {
  return (
    <article className="news-card">
      {item.image && <img className="news-card__img" src={item.image} alt="" />}
      <div className="news-card__body">
        {item.date && <span className="news-card__date">{item.date}</span>}
        <h3 className="news-card__title">{item.title}</h3>
        {item.description && <p className="news-card__desc">{item.description}</p>}
      </div>
    </article>
  )
}

export default function News() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchNews().then((data) => {
      if (cancelled) return
      setItems(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="news">
      <section className="news__hero">
        <span className="news__blob news__blob--1" />
        <span className="news__icon">
          <NewsIcon width={28} height={28} color="#fff" />
        </span>
        <h1 className="news__title">أخبار المعمل</h1>
        <p className="news__subtitle">آخر أخبار وإعلانات Trust Labs أول بأول</p>
      </section>

      <div className="news__list">
        {loading ? (
          <p className="news__loading">جاري التحميل...</p>
        ) : items.length === 0 ? (
          <div className="news__empty">
            <NewsIcon width={36} height={36} color="var(--text-muted)" />
            <p>لسه مفيش أخبار منشورة، تابعونا قريبًا هنا.</p>
          </div>
        ) : (
          items.map((item) => <NewsCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
