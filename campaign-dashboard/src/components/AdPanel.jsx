import { REGIONS, validateAd, suggestAudience, suggestBudget, seasonFor } from '../lib/ads.js'
import { useState } from 'react'

const GENDER_OPTIONS = [['all', 'الكل'], ['male', 'رجال'], ['female', 'ستات']]
const GOVERNORATES = [...new Set(REGIONS.map((r) => r.governorate))]

export default function AdPanel({ ad, post, category, season, onChange }) {
  const [advice, setAdvice] = useState(null)
  const set = (patch) => onChange({ ...ad, ...patch })
  const check = ad.enabled ? validateAd(ad) : { ok: true }
  const effectiveSeason = season ?? seasonFor(post.date)

  function suggest() {
    const regions = ad.regions.length ? ad.regions : REGIONS.filter((r) => r.tier === 1).map((r) => r.id)
    const audience = suggestAudience(category)
    const budget = suggestBudget({ postType: post.type, goal: 'sales', days: ad.days, regions, season: effectiveSeason })
    setAdvice({ budget, audience })
    onChange({ ...ad, regions, budget: budget.total, ageFrom: audience.ageFrom, ageTo: audience.ageTo, gender: audience.gender })
  }

  const toggleRegion = (id) => set({ regions: ad.regions.includes(id) ? ad.regions.filter((r) => r !== id) : [...ad.regions, id] })

  return (
    <section className={`ad-panel ${ad.enabled ? 'on' : ''}`}>
      <label className="check ad-toggle">
        <input type="checkbox" checked={ad.enabled} onChange={(e) => set({ enabled: e.target.checked })} aria-label="إعلان ممول" />
        إعلان ممول 💸
      </label>

      {ad.enabled && (
        <div className="ad-body fade-up">
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

          <button type="button" className="btn accent" onClick={suggest}>اقترح الميزانية والجمهور ✨</button>

          {!check.ok && <p role="alert" className="warn">{check.message}</p>}

          {advice && (
            <div className="advice">
              <p>
                <strong>المقترح: {advice.budget.total} جنيه</strong>
                <span className="muted"> ({advice.budget.perDay} جنيه في اليوم · من {advice.budget.min} لـ {advice.budget.max})</span>
              </p>
              <ul>{advice.budget.basis.map((b) => <li key={b}>{b}</li>)}</ul>
              {advice.budget.split.length > 0 && (
                <p className="muted">
                  التوزيع: {advice.budget.split.map((s) => `${s.region} ${s.amount}`).join(' · ')}
                </p>
              )}
              <p className="muted">الجمهور: {advice.audience.why}</p>
              <details>
                <summary>إزاي نزوّد أو نوقّف حسب النتيجة</summary>
                <ul>{advice.budget.rules.map((r) => <li key={r}>{r}</li>)}</ul>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
