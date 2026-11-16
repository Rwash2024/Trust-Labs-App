import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import Sidebar from './Sidebar.jsx'

const counts = { cards: 10, ready: 4, total: 10, competitorsMissing: 4, ideas: 3 }

test('renders the four sections and reports the chosen one', () => {
  const onTab = vi.fn()
  render(<Sidebar tab="calendar" onTab={onTab} counts={counts} />)
  for (const name of ['التقويم', 'المنشورات', 'المنافسين', 'بنك الأفكار']) {
    expect(screen.getByRole('button', { name: new RegExp(name) })).toBeTruthy()
  }
  fireEvent.click(screen.getByRole('button', { name: /المنافسين/ }))
  expect(onTab).toHaveBeenCalledWith('competitors')
})

test('marks the active section and shows badges', () => {
  render(<Sidebar tab="cards" onTab={() => {}} counts={counts} />)
  expect(screen.getByRole('button', { name: /المنشورات/ }).getAttribute('aria-current')).toBe('page')
  expect(screen.getByText('10')).toBeTruthy()
  expect(screen.getByText('4', { selector: '.badge' })).toBeTruthy()
})

test('collapse button toggles the collapsed class', () => {
  const { container } = render(<Sidebar tab="calendar" onTab={() => {}} counts={counts} />)
  const side = container.querySelector('aside')
  expect(side.className).not.toContain('collapsed')
  fireEvent.click(screen.getByRole('button', { name: /طي الشريط/ }))
  expect(side.className).toContain('collapsed')
})

test('shows month progress as ready out of total', () => {
  render(<Sidebar tab="calendar" onTab={() => {}} counts={counts} />)
  expect(screen.getByText('4 / 10')).toBeTruthy()
})

test('zero total does not crash the progress bar', () => {
  render(<Sidebar tab="calendar" onTab={() => {}} counts={{ ...counts, total: 0, ready: 0 }} />)
  expect(screen.getByText('0 / 0')).toBeTruthy()
})
