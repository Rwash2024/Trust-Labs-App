import { useState } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import CloudBar from './CloudBar.jsx'

const DB1 = { posts: [{ id: 'a' }], ideas: [] }
const DB2 = { posts: [{ id: 'a' }, { id: 'b' }], ideas: [] }
const session = { email: 'boss@example.com', role: 'admin' }

function mkCloud(over = {}) {
  return {
    enabled: true,
    getSession: vi.fn(() => null),
    signIn: vi.fn(async () => ({ ok: true, email: 'boss@example.com' })),
    signOut: vi.fn(),
    load: vi.fn(async () => ({ ok: true, row: null })),
    save: vi.fn(async () => ({ ok: true, version: 1, updatedAt: '2026-11-20T10:00:00Z' })),
    ...over,
  }
}
function Harness({ cloud, initial, onReplace }) {
  const [db, setDb] = useState(initial)
  return <CloudBar cloud={cloud} db={db} onReplaceDb={(d) => { onReplace?.(d); setDb(d) }} debounceMs={5} />
}
const row = (db, version = 4) => ({ db, version, updatedAt: '2026-11-19T08:00:00Z' })

async function signIn() {
  fireEvent.click(screen.getByRole('button', { name: /سجّل دخول للحفظ على السحابة/ }))
  fireEvent.change(screen.getByLabelText('الإيميل'), { target: { value: 'boss@example.com' } })
  fireEvent.change(screen.getByLabelText('الباسورد'), { target: { value: 'pw' } })
  fireEvent.click(screen.getByRole('button', { name: 'دخول' }))
}

test('when the cloud is not configured nothing is shown', () => {
  const { container } = render(<CloudBar cloud={mkCloud({ enabled: false })} db={DB1} onReplaceDb={() => {}} />)
  expect(container.firstChild).toBeNull()
})

test('signed out: offers a login form and sends the typed credentials', async () => {
  const cloud = mkCloud()
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await signIn()
  await waitFor(() => expect(cloud.signIn).toHaveBeenCalledWith('boss@example.com', 'pw'))
})

test('a failed login shows the error and keeps the form', async () => {
  const cloud = mkCloud({ signIn: vi.fn(async () => ({ ok: false, error: 'الإيميل أو الباسورد غلط.' })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await signIn()
  expect((await screen.findByRole('alert')).textContent).toMatch(/غلط/)
  expect(cloud.load).not.toHaveBeenCalled()
})

test('first sign-in with nothing in the cloud uploads the local plan as version 1', async () => {
  const cloud = mkCloud()
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await signIn()
  await waitFor(() => expect(cloud.save).toHaveBeenCalledWith(DB1, null))
  expect(await screen.findByText(/اتحفظ على السحابة/)).toBeTruthy()
})

test('a cloud copy identical to the local one needs no question and no upload', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: true, row: row(DB1) })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  expect(await screen.findByText(/اتحفظ على السحابة/)).toBeTruthy()
  expect(cloud.save).not.toHaveBeenCalled()
})

test('a different cloud copy asks which one to keep, and "use the cloud" replaces the local plan', async () => {
  const onReplaceDb = vi.fn()
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: true, row: row(DB2) })) })
  render(<Harness cloud={cloud} initial={DB1} onReplace={onReplaceDb} />)
  expect(await screen.findByText(/فيه نسخة على السحابة/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'استخدم نسخة السحابة' }))
  expect(onReplaceDb).toHaveBeenCalledWith(DB2)
  expect(await screen.findByText(/اتحفظ على السحابة/)).toBeTruthy()
  await act(async () => { await new Promise((r) => setTimeout(r, 40)) })
  expect(cloud.save).not.toHaveBeenCalled()
})

test('"overwrite with mine" saves the local plan on top of the cloud version', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: true, row: row(DB2, 7) })), save: vi.fn(async () => ({ ok: true, version: 8, updatedAt: 'x' })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  fireEvent.click(await screen.findByRole('button', { name: 'ارفع نسختي فوقها' }))
  await waitFor(() => expect(cloud.save).toHaveBeenCalledWith(DB1, 7))
})

test('nothing is auto-saved while the question is still open', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: true, row: row(DB2) })) })
  const { rerender } = render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await screen.findByText(/فيه نسخة على السحابة/)
  rerender(<CloudBar cloud={cloud} db={{ posts: [], ideas: [] }} onReplaceDb={() => {}} debounceMs={5} />)
  await act(async () => { await new Promise((r) => setTimeout(r, 40)) })
  expect(cloud.save).not.toHaveBeenCalled()
})

test('edits are saved automatically after a short pause, using the latest version number', async () => {
  const cloud = mkCloud({
    getSession: vi.fn(() => session),
    load: vi.fn(async () => ({ ok: true, row: row(DB1, 4) })),
    save: vi.fn(async (_db, v) => ({ ok: true, version: v + 1, updatedAt: 'x' })),
  })
  const { rerender } = render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await screen.findByText(/اتحفظ على السحابة/)
  rerender(<CloudBar cloud={cloud} db={DB2} onReplaceDb={() => {}} debounceMs={5} />)
  await waitFor(() => expect(cloud.save).toHaveBeenCalledWith(DB2, 4))
  const DB3 = { posts: [], ideas: [{ id: 'z' }] }
  rerender(<CloudBar cloud={cloud} db={DB3} onReplaceDb={() => {}} debounceMs={5} />)
  await waitFor(() => expect(cloud.save).toHaveBeenLastCalledWith(DB3, 5))
})

test('a conflict during auto-save re-opens the question with the newer cloud copy', async () => {
  const cloud = mkCloud({
    getSession: vi.fn(() => session),
    load: vi.fn()
      .mockResolvedValueOnce({ ok: true, row: row(DB1, 4) })
      .mockResolvedValueOnce({ ok: true, row: row({ posts: [{ id: 'other' }], ideas: [] }, 5) }),
    save: vi.fn(async () => ({ ok: false, conflict: true, error: 'x' })),
  })
  const { rerender } = render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await screen.findByText(/اتحفظ على السحابة/)
  rerender(<CloudBar cloud={cloud} db={DB2} onReplaceDb={() => {}} debounceMs={5} />)
  expect(await screen.findByText(/اتغيّرت من مكان تاني/)).toBeTruthy()
})

test('an expired session sends him back to the login form', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: false, needsLogin: true, error: 'سجّل دخول الأول.' })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  expect(await screen.findByRole('button', { name: /سجّل دخول للحفظ على السحابة/ })).toBeTruthy()
})

test('signing out clears the session and offers the login again', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: true, row: row(DB1) })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  await screen.findByText(/اتحفظ على السحابة/)
  fireEvent.click(screen.getByRole('button', { name: 'خروج' }))
  expect(cloud.signOut).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: /سجّل دخول للحفظ على السحابة/ })).toBeTruthy()
})

test('a network error is shown and does not claim the plan was saved', async () => {
  const cloud = mkCloud({ getSession: vi.fn(() => session), load: vi.fn(async () => ({ ok: false, error: 'مفيش اتصال بالسيرفر، جرّب تاني.' })) })
  render(<CloudBar cloud={cloud} db={DB1} onReplaceDb={() => {}} debounceMs={5} />)
  expect((await screen.findByRole('alert')).textContent).toMatch(/اتصال/)
  expect(screen.queryByText(/اتحفظ على السحابة/)).toBeNull()
})
