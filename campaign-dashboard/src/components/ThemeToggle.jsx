import { useEffect, useState } from 'react'

const KEY = 'cd-theme'

function readTheme() {
  try { return globalThis.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { globalThis.localStorage.setItem(KEY, theme) } catch { /* ignore */ }
  }, [theme])

  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className="btn theme-toggle"
      aria-label={dark ? 'الوضع الفاتح' : 'الوضع المظلم'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}
