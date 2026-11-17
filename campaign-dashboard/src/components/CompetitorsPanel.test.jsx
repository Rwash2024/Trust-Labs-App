import { render, screen } from '@testing-library/react'
import CompetitorsPanel from './CompetitorsPanel.jsx'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-12-20T12:00:00Z')
const ago = (d) => new Date(now - d * DAY).toISOString().slice(0, 10)
const props = { competitors: [], insights: [], note: '' }

test('shows when the data was pulled, without a warning when it is fresh', () => {
  render(<CompetitorsPanel {...props} pulledAt={ago(2)} now={now} />)
  expect(screen.getByText(/آخر تحديث/).textContent).toMatch(/2/)
  expect(screen.queryByRole('alert')).toBeNull()
})

test('old data raises a visible warning', () => {
  render(<CompetitorsPanel {...props} pulledAt={ago(40)} now={now} />)
  expect(screen.getByRole('alert').textContent).toMatch(/40/)
})

test('a missing date still warns', () => {
  render(<CompetitorsPanel {...props} now={now} />)
  expect(screen.getByRole('alert')).toBeTruthy()
})
