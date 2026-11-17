import { render, screen } from '@testing-library/react'
import PostPreview from './PostPreview.jsx'

const base = {
  id: 'p', type: 'post', platform: 'instagram', date: '2026-11-26', time: '21:00',
  headline: 'اطمّن على صحتك', caption: 'زيارة منزلية مجانية. اسأل واحجز.',
  hashtags: ['#معمل_تثق_به', '#Trust_Labs'], panelService: 'اسأل عن باقة الاطمئنان',
  panelBullets: ['سحب في بيتك', 'نتيجة أونلاين', 'ممرض بجوانتي', 'احجز دلوقتي'],
}
const long = ('كلمة '.repeat(120)).trim()

test('shows the brand, headline, panel text, caption and hashtags', () => {
  render(<PostPreview post={base} />)
  expect(screen.getByText('معمل تثق به')).toBeTruthy()
  expect(screen.getByText('اطمّن على صحتك')).toBeTruthy()
  expect(screen.getByText('اسأل عن باقة الاطمئنان')).toBeTruthy()
  expect(screen.getByText(/زيارة منزلية مجانية/)).toBeTruthy()
  expect(screen.getByText(/#معمل_تثق_به/)).toBeTruthy()
  expect(screen.queryByText(/المزيد/)).toBeNull()
})

test('a long caption is cut with a "more" marker', () => {
  render(<PostPreview post={{ ...base, caption: long }} />)
  expect(screen.getByText(/المزيد/)).toBeTruthy()
})

test('warns when the call to action would be hidden behind "more"', () => {
  render(<PostPreview post={{ ...base, caption: `${long} احجز دلوقتي` }} />)
  expect(screen.getByRole('note').textContent).toMatch(/الدعوة|احجز/)
})

test('no warning when the call to action is visible', () => {
  render(<PostPreview post={{ ...base, caption: `احجز دلوقتي. ${long}` }} />)
  expect(screen.queryByRole('note')).toBeNull()
})

test('a story shows no caption at all', () => {
  render(<PostPreview post={{ ...base, type: 'story' }} />)
  expect(screen.queryByText(/زيارة منزلية مجانية/)).toBeNull()
  expect(screen.getByText('اطمّن على صحتك')).toBeTruthy()
})

test('a reel gets a play marker and a carousel gets dots', () => {
  const { unmount } = render(<PostPreview post={{ ...base, type: 'reel' }} />)
  expect(screen.getByLabelText('ريل')).toBeTruthy()
  unmount()
  render(<PostPreview post={{ ...base, type: 'carousel' }} />)
  expect(screen.getByLabelText('كاروسيل')).toBeTruthy()
})

test('an empty draft does not crash and says what is missing', () => {
  render(<PostPreview post={{ ...base, headline: '', caption: '', hashtags: [], panelService: '', panelBullets: ['', '', '', ''] }} />)
  expect(screen.getByText(/لسه فاضي/)).toBeTruthy()
})
