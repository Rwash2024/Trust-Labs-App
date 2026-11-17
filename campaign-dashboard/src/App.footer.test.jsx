import { render, screen } from '@testing-library/react'
import App from './App.jsx'

test('the page ends with the same credit and copyright lines as the website and the app', () => {
  render(<App />)
  const footer = screen.getByRole('contentinfo')
  expect(footer.textContent).toContain('Designed & Developed by Mohamed Rwash · v1.0')
  expect(footer.textContent).toContain(`© ${new Date().getFullYear()} Trust Labs. All rights reserved.`)
})

test('the footer comes after the main content', () => {
  const { container } = render(<App />)
  const main = container.querySelector('main')
  const footer = container.querySelector('footer')
  expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})
