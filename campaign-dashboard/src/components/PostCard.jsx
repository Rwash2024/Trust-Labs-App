import CopyButton from './CopyButton.jsx'
import { buildImagePrompt, validateBullets } from '../lib/promptTemplate.js'
import { buildFormatPlan } from '../lib/formats.js'
import { checkPost } from '../lib/strength.js'
import AdPanel from './AdPanel.jsx'
import ResultPanel from './ResultPanel.jsx'
import { computeBenchmarks } from '../lib/ads.js'
import competitorsData from '../data/competitors.json'
import { detectCategory } from '../lib/templates.js'

const BENCH = computeBenchmarks(competitorsData.competitors)

const TYPE_LABEL = { post: 'بوست', reel: 'ريلز', carousel: 'كاروسيل', story: 'استوري' }
const PLATFORM_LABEL = { facebook: 'فيسبوك', instagram: 'انستجرام', tiktok: 'تيك توك' }

export default function PostCard({ post, onChange }) {
  const bulletCheck = validateBullets(post.panelBullets)
  const headlineLong = post.headline.trim().split(/\s+/).filter(Boolean).length > 3
  const imagePrompt = buildImagePrompt({
    ...post.image,
    serviceLine: post.panelService,
    bullets: post.panelBullets,
  })
  const plan = buildFormatPlan(post)
  const strength = checkPost(post)
  const panelText = [post.panelService, ...post.panelBullets.map((b) => `▪ ${b}`)].join('\n')

  const setBullet = (i, v) => onChange({ panelBullets: post.panelBullets.map((b, j) => (j === i ? v : b)) })
  const setImage = (k, v) => onChange({ image: { ...post.image, [k]: v } })

  return (
    <article className={`card post-card type-${post.type}`}>
      <header className="card-head">
        <span className={`chip type-${post.type}`}>{TYPE_LABEL[post.type]}</span>
        <span className="muted">{PLATFORM_LABEL[post.platform]} · {post.date} · {post.time}</span>
        <select value={post.status} onChange={(e) => onChange({ status: e.target.value })} aria-label="الحالة">
          <option value="idea">فكرة</option>
          <option value="ready">جاهز</option>
          <option value="published">اتنشر</option>
        </select>
      </header>

      <details className="strength" open={strength.tips.length > 0 && strength.score < 70}>
        <summary>
          <span className={`score ${strength.score >= 85 ? 'high' : strength.score >= 60 ? 'mid' : 'low'}`}>قوة المنشور {strength.score}/100</span>
          <span className="muted"> · مؤشر إرشادي بقواعد واضحة مش توقع للتفاعل</span>
        </summary>
        {strength.tips.length > 0 ? <ul>{strength.tips.map((t) => <li key={t}>{t}</li>)}</ul> : <p className="muted">كل القواعد متحققة 👌</p>}
      </details>

      <div className="field">
        <label>العنوان (للإليستريتور)</label>
        <div className="row">
          <input value={post.headline} onChange={(e) => onChange({ headline: e.target.value })} />
          <CopyButton text={post.headline} label="العنوان" />
        </div>
        {headlineLong && <p className="warn">العنوان أطول من 3 كلمات، يفضل تقصّره.</p>}
      </div>

      {plan && (
        <div className="field format-plan">
          <div className="row between">
            <label>{plan.title}</label>
            <CopyButton text={plan.steps.join('\n')} label="السيناريو" />
          </div>
          <ol>{plan.steps.map((st) => <li key={st}>{st}</li>)}</ol>
        </div>
      )}

      <div className="field">
        <label>الكابشن</label>
        <div className="row top">
          <textarea rows={3} value={post.caption} onChange={(e) => onChange({ caption: e.target.value })} />
          <CopyButton text={post.caption} label="الكابشن" />
        </div>
      </div>

      <div className="field">
        <label>الهاشتاجات</label>
        <div className="row">
          <input
            value={post.hashtags.join(' ')}
            onChange={(e) => onChange({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })}
          />
          <CopyButton text={post.hashtags.join(' ')} label="الهاشتاجات" />
        </div>
      </div>

      <div className="field">
        <label>نص اللوح الزجاجي</label>
        <div className="row top">
          <div className="panel-fields">
            <input value={post.panelService} onChange={(e) => onChange({ panelService: e.target.value })} />
            {post.panelBullets.map((b, i) => (
              <input key={i} value={b} onChange={(e) => setBullet(i, e.target.value)} aria-label={`نقطة ${i + 1}`} />
            ))}
          </div>
          <CopyButton text={panelText} label="نص اللوح" />
        </div>
        {!bulletCheck.ok && <p className="warn">{bulletCheck.message}</p>}
      </div>

      <details className="field">
        <summary>تفاصيل الصورة</summary>
        {['concept', 'subject', 'mood', 'accent'].map((k) => (
          <input
            key={k}
            value={post.image[k]}
            onChange={(e) => setImage(k, e.target.value)}
            aria-label={`image ${k}`}
            placeholder={k}
          />
        ))}
      </details>

      <AdPanel
        ad={post.ad}
        benchmarks={BENCH}
        post={post}
        category={detectCategory(`${post.headline} ${post.caption} ${post.panelService}`)}
        onChange={(ad) => onChange({ ad })}
      />

      <ResultPanel post={post} benchmarks={BENCH} onChange={(patch) => onChange({ result: { ...(post.result ?? {}), ...patch } })} />

      <div className="field">
        <div className="row between">
          <label>برومبت الصورة (ChatGPT / Gemini)</label>
          <CopyButton text={imagePrompt} label="برومبت الصورة" />
        </div>
        <pre className="prompt">{imagePrompt}</pre>
      </div>
    </article>
  )
}
