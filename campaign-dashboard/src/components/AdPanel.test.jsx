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

test('the suggest button applies a full automatic plan (budget, days, regions, audience) and explains why', () => {
  const onChange = vi.fn()
  const fbPost = { ...post, id: 'f1', platform: 'facebook', date: '2026-11-26', caption: 'خصم 15% على الباقات', panelService: 'باقة' }
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين'] }} post={fbPost} category="thyroid" onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: /اقترح/ }))
  const patch = onChange.mock.calls.at(-1)[0]
  expect(patch.enabled).toBe(true)
  expect(patch.budget).toBe(1800)
  expect(patch.days).toBe(5)
  expect(patch.regions).toHaveLength(7)
  expect(patch.gender).toBe('female')
  expect([patch.ageFrom, patch.ageTo]).toEqual([25, 50])
  expect(screen.getByText(/موسم مرتفع/)).toBeTruthy()
})

test('with no ad set yet it shows the automatic recommendation and approving applies it', () => {
  const onChange = vi.fn()
  const fbPost = { ...post, id: 'f2', platform: 'facebook', date: '2026-11-26', caption: 'خصم 15% على الباقات', panelService: 'باقة' }
  render(<AdPanel ad={undefined} post={fbPost} category="general" onChange={onChange} />)
  expect(screen.getByText(/المقترح تلقائيًا/)).toBeTruthy()
  expect(screen.getByText(/1800/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: /اعتمد المقترح/ }))
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, budget: 1800, days: 5 }))
})

test('a story with no ad set shows that it is not funded by default', () => {
  render(<AdPanel ad={undefined} post={{ ...post, id: 's1', type: 'story', platform: 'instagram', date: '2026-11-22' }} category="general" onChange={() => {}} />)
  expect(screen.getByText(/مش ممول/)).toBeTruthy()
})

test('a funded ad offers a copy-ready brief for Ads Manager', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, budget: 900, regions: ['المهندسين'] }} post={{ ...post, platform: 'facebook', date: '2026-11-26', time: '21:00' }} category="general" onChange={() => {}} />)
  expect(screen.getByRole('button', { name: /نسخ إعدادات الإعلان/ })).toBeTruthy()
})

test('a negative budget shows a warning instead of crashing', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true, regions: ['المهندسين'], budget: -3 }} post={post} category="general" onChange={() => {}} />)
  expect(screen.getByRole('alert').textContent).toMatch(/الميزانية/)
})

test('an enabled ad without regions asks for one', () => {
  render(<AdPanel ad={{ ...emptyAd(), enabled: true }} post={post} category="general" onChange={() => {}} />)
  expect(screen.getByRole('alert').textContent).toMatch(/منطقة/)
})
