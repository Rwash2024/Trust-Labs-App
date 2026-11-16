import { useState } from 'react'
import { exportDb, importDb } from '../lib/storage.js'
import { buildPlanCsv } from '../lib/csv.js'
import { backupReminder, getLastExport, markExported } from '../lib/backup.js'

export default function DataMenu({ db, onImport }) {
  const [error, setError] = useState('')
  const [reminder, setReminder] = useState(() => backupReminder({ lastExportAt: getLastExport() }))

  function onExport() {
    const blob = new Blob([exportDb(db)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-dashboard-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markExported()
    setReminder(null)
  }

  function onCsv() {
    const blob = new Blob([buildPlanCsv(db.posts, db.ideas)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plan-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = importDb(String(reader.result))
      if (r.ok) {
        setError('')
        onImport(r.db)
      } else {
        setError(r.error)
      }
    }
    reader.onerror = () => setError('مقدرتش أقرا الملف.')
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="data-menu">
      <button type="button" className="btn" onClick={onExport}>تصدير الملف</button>
      <button type="button" className="btn" onClick={onCsv}>تصدير الخطة (Excel)</button>
      <label className="btn">
        <span>استيراد ملف</span>
        <input type="file" accept="application/json,.json" aria-label="استيراد ملف" onChange={onFile} hidden />
      </label>
      {error && <p role="alert" className="warn">{error}</p>}
      {reminder && <p role="status" className="warn">{reminder}</p>}
    </div>
  )
}
