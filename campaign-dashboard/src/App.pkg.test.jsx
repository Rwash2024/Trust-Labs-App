import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App.jsx'
import { loadDb } from './lib/storage.js'

test('a campaign created with a package stores it on the idea and writes it into the posts', async () => {
  localStorage.clear()
  render(<App />)
  fireEvent.change(screen.getByLabelText('فكرة الحملة'), { target: { value: 'عروض الشتاء الجديدة' } })
  fireEvent.change(screen.getByLabelText('اسم الباقة (اختياري)'), { target: { value: 'باقة الشتاء' } })
  fireEvent.change(screen.getByLabelText('سعر الباقة (جنيه)'), { target: { value: '1200' } })
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  await waitFor(() => {
    const db = loadDb()
    const idea = db.ideas.find((i) => i.text === 'عروض الشتاء الجديدة')
    expect(idea.package).toEqual({ name: 'باقة الشتاء', price: 1200 })
    const mine = db.posts.filter((p) => p.ideaId === idea.id)
    expect(mine.length).toBeGreaterThan(0)
    for (const p of mine) expect(p.panelService).toContain('باقة الشتاء')
  })
})

test('"fill empty" also uses the package saved on the idea', async () => {
  const db = {
    schemaVersion: 1,
    ideas: [{ id: 'i', text: 'عروض الشتاء', createdAt: '2026-11-16', package: { name: 'باقة الشتاء', price: 900 } }],
    settings: { platforms: ['instagram'], timesByPlatform: { instagram: ['20:00'] } },
    posts: [{ id: 'a', ideaId: 'i', type: 'post', platform: 'instagram', date: '2026-12-02', time: '20:00', headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''], image: { concept: '', subject: '', mood: '', accent: '' }, status: 'idea' }],
  }
  localStorage.setItem('campaign-dashboard-db', JSON.stringify(db))
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /املأ الفاضي/ }))
  await waitFor(() => expect(loadDb().posts[0].panelService).toContain('باقة الشتاء'))
})
