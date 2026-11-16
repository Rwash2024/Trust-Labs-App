import { useState, useRef, useEffect } from 'react'
import { copyText } from '../lib/clipboard.js'

export default function CopyButton({ text, label = '' }) {
  const [state, setState] = useState('idle')
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function onClick() {
    const r = await copyText(text)
    setState(r.ok ? 'done' : 'fail')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 1500)
  }

  return (
    <button type="button" className={`copy-btn ${state}`} aria-label={`نسخ ${label}`.trim()} onClick={onClick}>
      {state === 'done' ? 'تم النسخ ✓' : state === 'fail' ? 'انسخ يدوي' : 'نسخ'}
    </button>
  )
}
