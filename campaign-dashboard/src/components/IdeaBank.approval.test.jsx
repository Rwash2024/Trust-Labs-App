import { render, screen, fireEvent } from '@testing-library/react'
import IdeaBank from './IdeaBank.jsx'

const idea = { id: 'i1', text: 'Green Friday', createdAt: '2026-11-16' }
const posts = [{ id: 'p1', ideaId: 'i1', status: 'ready' }]
const noop = () => {}

test('each campaign shows its approval status and lets him change it', () => {
  const onSetApproval = vi.fn()
  render(<IdeaBank ideas={[idea]} posts={posts} onReuse={noop} onToggleCheck={noop} onSetApproval={onSetApproval} />)
  const select = screen.getByLabelText('حالة موافقة الإدارة')
  expect(select.value).toBe('draft')
  fireEvent.change(select, { target: { value: 'review' } })
  expect(onSetApproval).toHaveBeenCalledWith('i1', 'review', '')
})

test('the note is sent with the status', () => {
  const onSetApproval = vi.fn()
  const approved = { ...idea, approval: { status: 'review', note: '', at: '2026-11-20' } }
  render(<IdeaBank ideas={[approved]} posts={posts} onReuse={noop} onToggleCheck={noop} onSetApproval={onSetApproval} />)
  fireEvent.change(screen.getByLabelText('ملاحظة الموافقة'), { target: { value: 'مبعوت للإدارة' } })
  fireEvent.blur(screen.getByLabelText('ملاحظة الموافقة'))
  expect(onSetApproval).toHaveBeenCalledWith('i1', 'review', 'مبعوت للإدارة')
})

test('an approved campaign shows the approval date', () => {
  const approved = { ...idea, approval: { status: 'approved', note: 'واتساب', at: '2026-11-20' }, checklist: { approval: true } }
  render(<IdeaBank ideas={[approved]} posts={posts} onReuse={noop} onToggleCheck={noop} onSetApproval={noop} />)
  expect(screen.getByLabelText('حالة موافقة الإدارة').value).toBe('approved')
  expect(screen.getByText(/2026-11-20/)).toBeTruthy()
})
