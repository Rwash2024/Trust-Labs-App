import { render, screen } from '@testing-library/react'
import AdCopyCheck from './AdCopyCheck.jsx'

const clean = { headline: 'اطمّن على صحتك', caption: 'زيارة منزلية مجانية. اسأل واحجز.', panelService: 'باقات', panelBullets: ['a', 'b', 'c', 'd'] }

test('lists each wording problem for a funded post', () => {
  render(<AdCopyCheck post={{ ...clean, caption: 'عندك سكر؟ خصم 30%', ad: { enabled: true } }} />)
  const items = screen.getAllByRole('listitem')
  expect(items.length).toBe(2)
  expect(screen.getByText(/فحص كلام الإعلان/)).toBeTruthy()
})

test('a funded post with clean wording gets a short all-clear that says it is not an approval', () => {
  render(<AdCopyCheck post={{ ...clean, ad: { enabled: true } }} />)
  expect(screen.getByText(/مش موافقة/)).toBeTruthy()
  expect(screen.queryAllByRole('listitem').length).toBe(0)
})

test('an unfunded post with clean wording shows nothing', () => {
  const { container } = render(<AdCopyCheck post={{ ...clean }} />)
  expect(container.firstChild).toBeNull()
})

test('an unfunded post with a problem still shows it', () => {
  render(<AdCopyCheck post={{ ...clean, caption: 'علاج السكر' }} />)
  expect(screen.getAllByRole('listitem').length).toBe(1)
})
