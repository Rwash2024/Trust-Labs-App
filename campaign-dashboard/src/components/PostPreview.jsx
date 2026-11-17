import { truncateCaption, ctaHidden, previewShape } from '../lib/preview.js'

const PLATFORM_LABEL = { facebook: 'فيسبوك', instagram: 'انستجرام', tiktok: 'تيك توك' }
const TYPE_LABEL = { post: 'بوست', reel: 'ريلز', carousel: 'كاروسيل', story: 'استوري' }

// A rough picture of how the post will look in the feed. The real image comes from the image prompt.
export default function PostPreview({ post }) {
  const shape = previewShape(post)
  const bullets = (post.panelBullets ?? []).filter((b) => String(b).trim())
  const hashtags = (post.hashtags ?? []).join(' ')
  const empty = !post.headline?.trim() && !post.caption?.trim() && !post.panelService?.trim() && !hashtags
  const { shown, truncated } = truncateCaption(post.caption, post.platform)
  const hidden = ctaHidden(post.caption, post.platform)

  if (empty) return <p className="muted">المعاينة: لسه فاضي، اكتب عنوان وكابشن أو دوس «املأ الفاضي».</p>

  return (
    <div className={`post-preview ${post.platform}`}>
      <div className="pv-head">
        <span className="pv-avatar" aria-hidden="true">T</span>
        <span>
          <strong>معمل تثق به</strong>
          <small className="muted"> {PLATFORM_LABEL[post.platform] ?? post.platform} · {TYPE_LABEL[post.type] ?? post.type}</small>
        </span>
      </div>

      <div className="pv-media" style={{ aspectRatio: shape.ratio }}>
        {shape.marker === 'play' && <span className="pv-marker" aria-label="ريل">▶</span>}
        {shape.marker === 'dots' && <span className="pv-marker dots" aria-label="كاروسيل">● ○ ○</span>}
        {shape.marker === 'story' && <span className="pv-marker bar" aria-label="استوري" />}
        <strong className="pv-headline">{post.headline}</strong>
        <div className="pv-glass">
          {post.panelService && <span className="pv-service">{post.panelService}</span>}
          {bullets.map((b) => <span key={b} className="pv-bullet">▪ {b}</span>)}
        </div>
      </div>

      {shape.showCaption && (
        <p className="pv-caption">
          {shown}
          {truncated && <span className="pv-more"> … المزيد</span>}
          {hashtags && <span className="pv-tags"> {hashtags}</span>}
        </p>
      )}
      {hidden && <p role="note" className="warn">الدعوة للحجز بتظهر بعد قطع «المزيد»، قدّمها في أول سطر.</p>}
      <p className="muted pv-note">شكل تقريبي. الصورة الحقيقية بتتولّد من البرومبت، وحدّ القطع بيختلف حسب الجهاز.</p>
    </div>
  )
}
