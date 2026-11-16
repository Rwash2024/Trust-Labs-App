import { backupReminder, markExported, getLastExport } from './backup.js'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-11-20T12:00:00Z').getTime()

test('never exported: asks for a first backup', () => {
  const r = backupReminder({ lastExportAt: null, now })
  expect(r).toMatch(/[؀-ۿ]/)
  expect(r).toMatch(/لسه/)
})

test('exported today or yesterday: no reminder', () => {
  expect(backupReminder({ lastExportAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(), now })).toBeNull()
  expect(backupReminder({ lastExportAt: new Date(now - DAY).toISOString(), now })).toBeNull()
})

test('older than 3 days: reminds and says how many days', () => {
  const r = backupReminder({ lastExportAt: new Date(now - 5 * DAY).toISOString(), now })
  expect(r).toMatch(/5/)
})

test('a garbage or future date is treated as never exported, never throws', () => {
  expect(backupReminder({ lastExportAt: 'not-a-date', now })).toMatch(/لسه/)
  expect(backupReminder({ lastExportAt: new Date(now + 9 * DAY).toISOString(), now })).toMatch(/لسه/)
})

test('markExported stores the time and getLastExport reads it back', () => {
  expect(getLastExport()).toBeNull()
  markExported(new Date('2026-11-20T10:00:00Z').getTime())
  expect(getLastExport()).toBe('2026-11-20T10:00:00.000Z')
})

test('storage that throws never breaks the app', () => {
  const orig = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
  expect(getLastExport()).toBeNull()
  expect(() => markExported(now)).not.toThrow()
  Object.defineProperty(globalThis, 'localStorage', orig)
})
