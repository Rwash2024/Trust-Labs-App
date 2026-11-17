import { useEffect, useRef, useState } from 'react'

const stamp = (iso) => (iso ? String(iso).slice(0, 16).replace('T', ' ') : '')
const json = (db) => JSON.stringify(db)

// Cloud save status and controls. The plan stays usable offline; signing in (admin accounts only) keeps one shared copy in the cloud.
export default function CloudBar({ cloud, db, onReplaceDb, debounceMs = 1200 }) {
  const [phase, setPhase] = useState(() => (cloud.enabled && cloud.getSession() ? 'syncing' : 'signedout'))
  const [message, setMessage] = useState('')
  const [choice, setChoice] = useState(null)
  const [savedAt, setSavedAt] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const versionRef = useRef(null)
  const lastJsonRef = useRef(null)
  const dbRef = useRef(db)
  dbRef.current = db

  function markSaved(version, updatedAt, savedJson) {
    versionRef.current = version
    lastJsonRef.current = savedJson
    setSavedAt(stamp(updatedAt))
    setMessage('')
    setPhase('saved')
  }

  async function pushLocal(expectedVersion) {
    setPhase('saving')
    const sent = json(dbRef.current)
    const r = await cloud.save(dbRef.current, expectedVersion)
    if (r.ok) return markSaved(r.version, r.updatedAt, sent)
    if (r.conflict) {
      const l = await cloud.load()
      if (l.ok && l.row) {
        setChoice(l.row)
        setPhase('conflict')
        return
      }
    }
    if (r.needsLogin) {
      setMessage(r.error)
      setPhase('signedout')
      return
    }
    setMessage(r.error || 'حصلت مشكلة في الحفظ.')
    setPhase('error')
  }

  async function sync() {
    setPhase('syncing')
    const r = await cloud.load()
    if (!r.ok) {
      setMessage(r.error)
      setPhase(r.needsLogin ? 'signedout' : 'error')
      return
    }
    if (!r.row) return pushLocal(null)
    versionRef.current = r.row.version
    if (json(r.row.db) === json(dbRef.current)) return markSaved(r.row.version, r.row.updatedAt, json(r.row.db))
    setChoice(r.row)
    setPhase('choice')
  }

  useEffect(() => {
    if (cloud.enabled && cloud.getSession()) sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // auto-save a moment after the last edit, only when the cloud copy is known and in step
  useEffect(() => {
    if (phase !== 'saved') return undefined
    if (json(db) === lastJsonRef.current) return undefined
    const timer = setTimeout(() => pushLocal(versionRef.current), debounceMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, phase, debounceMs])

  async function onLogin(e) {
    e.preventDefault()
    setMessage('')
    const r = await cloud.signIn(email.trim(), password)
    setPassword('')
    if (!r.ok) {
      setMessage(r.error)
      return
    }
    await sync()
  }

  function useCloudCopy() {
    versionRef.current = choice.version
    lastJsonRef.current = json(choice.db)
    onReplaceDb(choice.db)
    setSavedAt(stamp(choice.updatedAt))
    setChoice(null)
    setPhase('saved')
  }

  function overwriteWithMine() {
    const v = choice.version
    setChoice(null)
    pushLocal(v)
  }

  function logout() {
    cloud.signOut()
    versionRef.current = null
    lastJsonRef.current = null
    setMessage('')
    setPhase('signedout')
  }

  if (!cloud.enabled) return null

  if (phase === 'signedout' || phase === 'form') {
    return (
      <div className="cloud-bar">
        {phase === 'signedout' && (
          <button type="button" className="btn" onClick={() => setPhase('form')}>☁️ سجّل دخول للحفظ على السحابة</button>
        )}
        {phase === 'form' && (
          <form className="cloud-form row wrap" onSubmit={onLogin}>
            <div>
              <label htmlFor="cloud-email">الإيميل</label>
              <input id="cloud-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="الإيميل" />
            </div>
            <div>
              <label htmlFor="cloud-pass">الباسورد</label>
              <input id="cloud-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="الباسورد" />
            </div>
            <button type="submit" className="btn primary">دخول</button>
            <button type="button" className="btn" onClick={() => setPhase('signedout')}>إلغاء</button>
          </form>
        )}
        {message && <p role="alert" className="warn">{message}</p>}
      </div>
    )
  }

  if (phase === 'choice' || phase === 'conflict') {
    return (
      <div className="cloud-bar cloud-choice warn" role="group" aria-label="اختيار النسخة">
        <p>
          {phase === 'choice'
            ? `فيه نسخة على السحابة (آخر تحديث ${stamp(choice.updatedAt)}) مختلفة عن اللي عندك.`
            : `النسخة على السحابة اتغيّرت من مكان تاني (آخر تحديث ${stamp(choice.updatedAt)}).`}
        </p>
        <div className="row wrap">
          <button type="button" className="btn primary" onClick={useCloudCopy}>استخدم نسخة السحابة</button>
          <button type="button" className="btn" onClick={overwriteWithMine}>ارفع نسختي فوقها</button>
        </div>
      </div>
    )
  }

  return (
    <div className="cloud-bar row wrap">
      {phase === 'syncing' && <span className="muted">☁️ بيتزامن مع السحابة…</span>}
      {phase === 'saving' && <span className="muted">☁️ بيحفظ…</span>}
      {phase === 'saved' && <span className="muted">☁️ اتحفظ على السحابة ✓ <bdi dir="ltr">{savedAt}</bdi></span>}
      {phase === 'error' && (
        <>
          <p role="alert" className="warn">{message}</p>
          <button type="button" className="btn" onClick={sync}>جرّب تاني</button>
        </>
      )}
      <button type="button" className="btn" onClick={logout}>خروج</button>
    </div>
  )
}
