import { render, screen, fireEvent } from '@testing-library/react'
import IdeaForm from './IdeaForm.jsx'

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

test('submitting without a package sends pkg as null', () => {
  const onSubmit = vi.fn()
  render(<IdeaForm existingIdeas={[]} onSubmit={onSubmit} />)
  fill('فكرة الحملة', 'عروض الشتاء')
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
  expect(onSubmit.mock.calls[0][0].pkg).toBeNull()
})

test('package name and price are sent together', () => {
  const onSubmit = vi.fn()
  render(<IdeaForm existingIdeas={[]} onSubmit={onSubmit} />)
  fill('فكرة الحملة', 'عروض الشتاء')
  fill('اسم الباقة (اختياري)', 'باقة الشتاء')
  fill('سعر الباقة (جنيه)', '1200')
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  expect(onSubmit.mock.calls[0][0].pkg).toEqual({ name: 'باقة الشتاء', price: 1200 })
})

test('a price without a name blocks the submit and explains why', () => {
  const onSubmit = vi.fn()
  render(<IdeaForm existingIdeas={[]} onSubmit={onSubmit} />)
  fill('فكرة الحملة', 'عروض الشتاء')
  fill('سعر الباقة (جنيه)', '500')
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toMatch(/[؀-ۿ]/)
})

test('a bad price blocks the submit', () => {
  const onSubmit = vi.fn()
  render(<IdeaForm existingIdeas={[]} onSubmit={onSubmit} />)
  fill('فكرة الحملة', 'عروض الشتاء')
  fill('اسم الباقة (اختياري)', 'باقة الشتاء')
  fill('سعر الباقة (جنيه)', '-5')
  fireEvent.click(screen.getByRole('button', { name: /جهّز الخطة/ }))
  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toBeTruthy()
})
