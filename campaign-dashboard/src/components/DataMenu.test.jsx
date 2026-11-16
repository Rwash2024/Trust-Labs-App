import { render, screen, fireEvent } from '@testing-library/react'
import DataMenu from './DataMenu.jsx'
import { emptyDb } from '../lib/storage.js'
import { getLastExport } from '../lib/backup.js'

beforeEach(() => {
  localStorage.clear()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})

test('before any export it shows the backup reminder', () => {
  render(<DataMenu db={emptyDb()} onImport={() => {}} />)
  expect(screen.getByRole('status').textContent).toMatch(/نسخة احتياطية/)
})

test('exporting records the time and the reminder disappears', () => {
  render(<DataMenu db={emptyDb()} onImport={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'تصدير الملف' }))
  expect(getLastExport()).not.toBeNull()
  expect(screen.queryByRole('status')).toBeNull()
})

test('a recent export means no reminder on load', () => {
  localStorage.setItem('campaign-dashboard-last-export', new Date().toISOString())
  render(<DataMenu db={emptyDb()} onImport={() => {}} />)
  expect(screen.queryByRole('status')).toBeNull()
})
