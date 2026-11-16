import { render, screen, fireEvent } from '@testing-library/react'
import IdeaBank from './IdeaBank.jsx'

const ideas = [{ id: 'i1', text: 'Green Friday', createdAt: '2026-11-16' }]
const posts = [{ id: 'p1', ideaId: 'i1', status: 'ready' }]

test('each idea shows its readiness count', () => {
  render(<IdeaBank ideas={ideas} posts={posts} onReuse={() => {}} onToggleCheck={() => {}} />)
  expect(screen.getByText(/جاهزية الحملة/).textContent).toMatch(/2 \/ 8/)
})

test('ticking an item reports the idea and item ids', () => {
  const onToggleCheck = vi.fn()
  render(<IdeaBank ideas={ideas} posts={posts} onReuse={() => {}} onToggleCheck={onToggleCheck} />)
  fireEvent.click(screen.getByLabelText('موافقة الإدارة مكتوبة'))
  expect(onToggleCheck).toHaveBeenCalledWith('i1', 'approval')
})

test('auto items are shown ticked but cannot be changed by hand', () => {
  render(<IdeaBank ideas={ideas} posts={posts} onReuse={() => {}} onToggleCheck={() => {}} />)
  const box = screen.getByLabelText('كل المنشورات مكتوبة وجاهزة')
  expect(box.checked).toBe(true)
  expect(box.disabled).toBe(true)
})

test('a campaign with every item done says it is ready', () => {
  const done = { ...ideas[0], checklist: { approval: true, offer: true, tracking: true, visuals: true, branches: true, support: true } }
  render(<IdeaBank ideas={[done]} posts={posts} onReuse={() => {}} onToggleCheck={() => {}} />)
  expect(screen.getByText(/جاهزة للإطلاق/)).toBeTruthy()
})
