import { useState } from 'react'

const KEY = 'cd-sidebar-collapsed'

const ICONS = {
  calendar: <path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  cards: <path d="M4 20h4l10-10-4-4L4 16v4zM13 7l4 4" />,
  competitors: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.8" /></>,
  ideas: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />,
}

const ITEMS = [
  { id: 'calendar', label: 'التقويم', color: 'violet', group: 'الحملة' },
  { id: 'cards', label: 'المنشورات', color: 'coral', group: 'الحملة', badge: 'cards' },
  { id: 'competitors', label: 'المنافسين', color: 'mint', group: 'الأدوات', badge: 'competitorsMissing' },
  { id: 'ideas', label: 'بنك الأفكار', color: 'sun', group: 'الأدوات', badge: 'ideas' },
]

function readCollapsed() {
  try { return globalThis.localStorage.getItem(KEY) === '1' } catch { return false }
}

export default function Sidebar({ tab, onTab, counts }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const pct = counts.total ? Math.round((counts.ready / counts.total) * 100) : 0

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try { globalThis.localStorage.setItem(KEY, next ? '1' : '0') } catch { /* ignore */ }
  }

  let lastGroup = ''
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="side-top">
        <div className="brand-tile" aria-hidden="true">📣</div>
        <div className="side-title">
          <strong>مركز الحملات</strong>
          <span>Campaign Hub</span>
        </div>
        <button type="button" className="side-toggle" aria-label={collapsed ? 'فتح الشريط' : 'طي الشريط'} onClick={toggle}>
          {collapsed ? '‹' : '›'}
        </button>
      </div>

      <nav className="side-nav">
        {ITEMS.map((it, i) => {
          const showGroup = it.group !== lastGroup
          lastGroup = it.group
          const badge = it.badge ? counts[it.badge] : 0
          return (
            <div key={it.id} className="side-row" style={{ '--i': i }}>
              {showGroup && <p className="side-group">{it.group}</p>}
              <button
                type="button"
                className={`side-item ${tab === it.id ? 'active' : ''}`}
                aria-current={tab === it.id ? 'page' : undefined}
                data-label={it.label}
                onClick={() => onTab(it.id)}
              >
                <span className={`tile ${it.color}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[it.id]}
                  </svg>
                </span>
                <span className="side-label">{it.label}</span>
                {badge > 0 && <span className="side-badge badge">{badge}</span>}
              </button>
            </div>
          )
        })}
      </nav>

      <div className="side-progress" aria-label="تقدم الشهر">
        <div className="row between">
          <span className="side-label">منشورات الشهر</span>
          <bdi dir="ltr" className="progress-num">{counts.ready} / {counts.total}</bdi>
        </div>
        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
        <span className="side-label muted">الجاهز من الإجمالي</span>
      </div>

      <div className="side-user">
        <span className="avatar">م<i /></span>
        <span className="side-label"><strong>محمد</strong><br /><small>فريق التسويق</small></span>
      </div>
    </aside>
  )
}
