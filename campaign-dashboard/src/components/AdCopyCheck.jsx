import { checkAdCopy } from '../lib/adCompliance.js'

export default function AdCopyCheck({ post }) {
  const { issues } = checkAdCopy(post)
  const funded = Boolean(post.ad?.enabled)
  if (!issues.length && !funded) return null
  if (!issues.length) {
    return <p className="muted copy-check-ok">فحص كلام الإعلان: ما لقيتش مشاكل ✅ (فحص مبدئي، مش موافقة من ميتا)</p>
  }
  return (
    <section className="warn copy-check">
      <strong>فحص كلام الإعلان ⚠️</strong>
      <ul>
        {issues.map((i) => <li key={i.id}>{i.message}</li>)}
      </ul>
    </section>
  )
}
