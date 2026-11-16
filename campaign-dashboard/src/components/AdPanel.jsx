import { useState } from 'react'
import CopyButton from './CopyButton.jsx'
import { REGIONS, validateAd, recommendAd, buildAdBrief } from '../lib/ads.js'

const GENDER_OPTIONS = [['all', 'الكل'], ['male', 'رجال'], ['female', 'ستات']]
const GENDER_AR = { all: 'الكل', male: 'رجال', female: 'ستات' }
const GOVERNORATES = [...new Set(REGIONS.map((r) => r.governorate))]

function Summary({ ad }) {
  if (!ad.enabled) return <p><strong>مش ممول بشكل افتراضي.</strong></p>
  return (
    <p>
      <strong>الميزانية: {ad.budget} جنيه</strong>
      <span className="muted"> · {ad.days} أيام · السن {ad.ageFrom}–{ad.ageTo} · {GENDER_AR[ad.gender]} · {ad.regions.length} مناطق ({ad.regions.join('، ')})</span>
    </p>
  )
}

export default function AdPanel({ ad, post, category, benchmarks, onChange }) {
  const [advice, setAdvice] = useState(null)
  const rec = recommendAd(post, { category, benchmarks })

  // No ad chosen yet: show the automatic plan, ready to approve (Mohamed edits afterwards if he wants).
  if (ad === undefined) {
    return (
      <section className="boost-panel auto">
        <div className="row between">
          <span className="boost-toggle">إعلان ممول 💸 <small className="muted">· المقترح تلقائيًا</small></span>
          <span className="row">
            <CopyButton text={buildAdBrief(post, rec.ad)} label="إعدادات الإعلان" />
            <button type="button" className="btn accent" onClick={() => onChange(rec.ad)}>اعتمد المقترح وعدّل ✏️</button>
          </span>
        </div>
        <Summary ad={rec.ad} />
        <details>
          <summary>ليه كده؟</summary>
          <ul className="advice-list">{rec.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </details>
      </section>
    )
  }

  const set = (patch) => onChange({ ...ad, ...patch })
  const check = ad.enabled ? validateAd(ad) : { ok: true }

  function suggest() {
    setAdvice(rec)
    onChange({ ...ad, ...rec.ad, enabled: rec.ad.enabled || ad.enabled })
  }

  const toggleRegion = (id) => set({ regions: ad.regions.includes(id) ? ad.regions.filter((r) => r !== id) : [...ad.regions, id] })

  return (
    <section className={`boost-panel ${ad.enabled ? 'on' : ''}`}>
      <label className="check boost-toggle">
        <input type="checkbox" checked={ad.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label="إعلان ممول" />
        إعلان ممول 💸
      </label>

      {ad.enabled && (
        <div className="boost-body fade-up">
          <div className="row wrap">
            <div>
              <label htmlFor={`b-${post.id}`}>الميزانية (جنيه)</label>
              <input
                id={`b-${post.id}`}
                type="number"
                min="0"
                step="50"
                placeholder="اختياري"
                value={ad.budget ?? ''}
                onChange={(e) => set({ budget: e.target.value === '' ? null : Number(e.target.value) })}
                aria-label="الميزانية (جنيه)"
              />
            </div>
            <div>
              <label htmlFor={`d-${post.id}`}>مدة الإعلان (أيام)</label>
              <input id={`d-${post.id}`} type="number" min="1" max="30" value={ad.days} onChange={(e) => set({ days: Number(e.target.value) })} aria-label="مدة الإعلان (أيام)" />
            </div>
            <div>
              <label htmlFor={`af-${post.id}`}>السن من</label>
              <input id={`af-${post.id}`} type="number" min="18" max="65" value={ad.ageFrom} onChange={(e) => set({ ageFrom: Number(e.target.value) })} aria-label="السن من" />
            </div>
            <div>
              <label htmlFor={`at-${post.id}`}>السن إلى</label>
              <input id={`at-${post.id}`} type="number" min="18" max="65" value={ad.ageTo} onChange={(e) => set({ ageTo: Number(e.target.value) })} aria-label="السن إلى" />
            </div>
          </div>

          <div className="field">
            <span className="lbl">الجنس</span>
            <div className="seg" role="radiogroup">
              {GENDER_OPTIONS.map(([id, label]) => (
                <label key={id} className={`seg-item ${ad.gender === id ? 'active' : ''}`}>
                  <input type="radio" name={`g-${post.id}`} checked={ad.gender === id} onChange={() => set({ gender: id })} aria-label={label} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="lbl">المنطقة (حسب فروعنا)</span>
            {GOVERNORATES.map((g) => (
              <div key={g} className="region-group">
                <small className="muted">{g}</small>
                <div className="chips">
                  {REGIONS.filter((r) => r.governorate === g).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`region ${ad.regions.includes(r.id) ? 'on' : ''} tier-${r.tier}`}
                      aria-pressed={ad.regions.includes(r.id)}
                      title={r.tier === 1 ? 'أولوية أولى (60% من الميزانية)' : r.tier === 2 ? 'أولوية تانية (25%)' : 'باقي الفروع (15%)'}
                      onClick={() => toggleRegion(r.id)}
                    >
                      {r.id}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {!check.ok && <p role="alert" className="warn">{check.message}</p>}
        </div>
      )}

      <div className="row wrap boost-actions">
        <button type="button" className="btn accent" onClick={suggest}>اقترح الميزانية والجمهور ✨</button>
        {ad.enabled && <CopyButton text={buildAdBrief(post, ad)} label="إعدادات الإعلان" />}
      </div>

      {advice && (
        <div className="advice">
          {advice.budget && (
            <p>
              <strong>المقترح: {advice.budget.total} جنيه</strong>
              <span className="muted"> ({Math.round(advice.budget.total / advice.ad.days)} جنيه في اليوم)</span>
            </p>
          )}
          <ul>{advice.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          {advice.budget?.split?.length > 0 && (
            <p className="muted">التوزيع: {advice.budget.split.map((s) => `${s.region} ${s.amount}`).join(' · ')}</p>
          )}
          {advice.budget?.rules && (
            <details>
              <summary>إزاي نزوّد أو نوقّف حسب النتيجة</summary>
              <ul>{advice.budget.rules.map((r) => <li key={r}>{r}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  )
}
