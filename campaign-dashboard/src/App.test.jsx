import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App.jsx'
import { loadDb } from './lib/storage.js'

test('renders the dashboard title', () => {
  render(<App />)
  expect(screen.getByText('داشبورد الحملات')).toBeTruthy()
})

test('a new idea creates posts that are already filled in', async () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText('فكرة الحملة'), { target: { value: 'تحاليل الغدة الدرقية للسيدات' } })
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  await waitFor(() => {
    const mine = loadDb().posts.filter((p) => p.ideaId !== 'idea-1' && p.ideaId !== 'idea-2' && p.ideaId !== 'idea-3')
    expect(mine.length).toBeGreaterThan(0)
    for (const p of mine) {
      expect(p.headline.length).toBeGreaterThan(0)
      expect(p.panelBullets.every((b) => b.length > 0)).toBe(true)
    }
  })
})

test('fill button completes empty posts in the shown month', async () => {
  const empty = { schemaVersion: 1, ideas: [{ id: 'i', text: 'حملة ضغط الدم', createdAt: '2026-11-16' }], settings: { platforms: ['instagram'], timesByPlatform: { instagram: ['20:00'] } },
    posts: [{ id: 'a', ideaId: 'i', type: 'post', platform: 'instagram', date: '2026-12-02', time: '20:00', headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''], image: { concept: '', subject: '', mood: '', accent: '' }, status: 'idea' }] }
  localStorage.setItem('campaign-dashboard-db', JSON.stringify(empty))
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /املأ الفاضي/ }))
  await waitFor(() => expect(loadDb().posts[0].headline.length).toBeGreaterThan(0))
})

test('document is right-to-left', () => {
  render(<App />)
  expect(document.documentElement.getAttribute('dir') ?? 'rtl').toBe('rtl')
})
