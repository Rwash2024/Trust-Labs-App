import { render, screen } from '@testing-library/react'
import CompetitorsPanel from './CompetitorsPanel.jsx'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-12-20T12:00:00Z')
const ago = (d) => new Date(now - d * DAY).toISOString().slice(0, 10)
const props = { competitors: [], insights: [], note: '', now }

test('old data offers a ready-to-send refresh request', () => {
  render(<CompetitorsPanel {...props} pulledAt={ago(40)} />)
  expect(screen.getByRole('button', { name: /نسخ طلب التحديث/ })).toBeTruthy()
})

test('data that is only a bit old still offers it', () => {
  render(<CompetitorsPanel {...props} pulledAt={ago(20)} />)
  expect(screen.getByRole('button', { name: /نسخ طلب التحديث/ })).toBeTruthy()
})

test('fresh data does not nag', () => {
  render(<CompetitorsPanel {...props} pulledAt={ago(3)} />)
  expect(screen.queryByRole('button', { name: /نسخ طلب التحديث/ })).toBeNull()
})

test('a missing date counts as old', () => {
  render(<CompetitorsPanel {...props} />)
  expect(screen.getByRole('button', { name: /نسخ طلب التحديث/ })).toBeTruthy()
})
