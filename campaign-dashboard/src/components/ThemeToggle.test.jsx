import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle.jsx'

afterEach(() => document.documentElement.removeAttribute('data-theme'))

test('starts light and toggles to dark and back, saving the choice', () => {
  render(<ThemeToggle />)
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  fireEvent.click(screen.getByRole('button', { name: /الوضع المظلم/ }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  expect(localStorage.getItem('cd-theme')).toBe('dark')
  fireEvent.click(screen.getByRole('button', { name: /الوضع الفاتح/ }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('light')
})

test('restores a saved dark choice', () => {
  localStorage.setItem('cd-theme', 'dark')
  render(<ThemeToggle />)
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
})

test('works when storage is blocked', () => {
  const orig = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('blocked') }, configurable: true })
  render(<ThemeToggle />)
  fireEvent.click(screen.getByRole('button', { name: /الوضع المظلم/ }))
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  Object.defineProperty(globalThis, 'localStorage', orig)
})
