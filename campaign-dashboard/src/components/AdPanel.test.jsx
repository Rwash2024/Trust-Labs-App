import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import AdPanel from './AdPanel.jsx'
import { emptyAd } from '../lib/ads.js'

const post = { type: 'post', headline: 'الجمعة الخضراء', image: {}, panelService: 'x', panelBullets: ['', '', '', ''], hashtags: [], caption: '' }

test('starts collapsed with a toggle; enabling reports the change', () => {
  const onChange = vi.fn()
  render(<AdPanel ad={emptyAd()} post={post} category="general" onChange={onChange} />)
  expect(screen.queryByLabelText('الميزانية (جنيه)')).toBeNull()
  fireEvent.click(screen.getByLabelText('إعلان ممول'))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }))
})

test('shows budget, days, age and gender fields when enabled, and budget is optional', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين'] }} post={post} category="general" onChange={() => {}} />)
  expect(screen.getByLabelText('الميزانية (جنيه)').value).toBe('')
  expect(screen.getByLabelText('مدة الإعلان (أيام)')).toBeTruthy()
  expect(screen.getByLabelText('السن من')).toBeTruthy()
  expect(screen.getByLabelText('السن إلى')).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'رجال' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'ستات' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'الكل' })).toBeTruthy()
})

test('toggling a branch region adds it and removing it takes it out', () => {
  const onChange = vi.fn()
  const { rerender } = render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: [] }} post={post} category="general" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'المهندسين' }))
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ regions: ['المهندسين'] }))
  rerender(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين'] }} post={post} category="general" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: 'المهندسين' }))
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ regions: [] }))
})

test('the suggestion button fills budget and audience and explains why', () => {
  const onChange = vi.fn()
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين', 'التجمع الخامس'] }} post={post} category="thyroid" season="high" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /اقترح/ }))
  const patch = onChange.mock.calls.at(-1)[0]
  expect(patch.budget).toBe(1300)
  expect(patch.gender).toBe('female')
  expect([patch.ageFrom, patch.ageTo]).toEqual([25, 50])
  expect(screen.getByText(/موسم مرتفع/)).toBeTruthy()
})

test('a negative budget shows a warning instead of crashing', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين'], budget: -3 }} post={post} category="general" onChange={() => {}} />)
  expect(screen.getByRole('alert').textContent).toMatch(/الميزانية/)
})

test('an enabled ad without regions asks for one', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true }} post={post} category="general" onChange={() => {}} />)
  expect(screen.getByRole('alert').textContent).toMatch(/منطقة/)
})
