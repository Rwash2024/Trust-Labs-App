const PLATFORM_OPTIONS = [
  ['facebook', 'فيسبوك'],
  ['instagram', 'انستجرام'],
  ['tiktok', 'تيك توك'],
]

export default function PlanSettings({ settings, onChange }) {
  function toggle(id) {
    const on = settings.platforms.includes(id)
    const platforms = on ? settings.platforms.filter((p) => p !== id) : [...settings.platforms, id]
    const timesByPlatform = { ...settings.timesByPlatform }
    if (!on && !timesByPlatform[id]) timesByPlatform[id] = ['20:00']
    onChange({ ...settings, platforms, timesByPlatform })
  }

  function setTimes(id, text) {
    const times = text.split(/[,،\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t))
    onChange({ ...settings, timesByPlatform: { ...settings.timesByPlatform, [id]: times.length ? times : ['20:00'] } })
  }

  return (
    <div className="card plan-settings">
      <h3>المنصات والمواعيد</h3>
      {PLATFORM_OPTIONS.map(([id, label]) => (
        <div key={id} className="row">
          <label className="check">
            <input type="checkbox" checked={settings.platforms.includes(id)} onChange={() => toggle(id)} />
            {label}
          </label>
          {settings.platforms.includes(id) && (
            <input
              className="times"
              aria-label={`مواعيد ${label}`}
              defaultValue={(settings.timesByPlatform[id] || []).join(', ')}
              onBlur={(e) => setTimes(id, e.target.value)}
              placeholder="19:00, 21:00"
            />
          )}
        </div>
      ))}
    </div>
  )
}
