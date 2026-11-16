import { render, screen, fireEvent } from '@testing-library/react'
import ResultPanel from './ResultPanel.jsx'

const B = { fbTop3Avg: 200, igLikesMedian: 100, reelPlaysMedian: 10000 }
const post = { id: 'p1', type: 'post', platform: 'facebook', status: 'published', ad: { enabled: true, budget: 2000 } }

test('typing a number reports the whole result object', () => {
  const onChange = vi.fn()
  render(<ResultPanel post={post} benchmarks={B} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('الحجوزات'), { target: { value: '8' } })
  expect(onChange).toHaveBeenCalledWith({ bookings: 8 })
})

test('clearing a field stores null, not zero or NaN', () => {
  const onChange = vi.fn()
  render(<ResultPanel post={{ ...post, result: { bookings: 8 } }} benchmarks={B} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('الحجوزات'), { target: { value: '' } })
  expect(onChange).toHaveBeenCalledWith({ bookings: null })
})

test('shows cost per booking and the competitor verdict once numbers exist', () => {
  render(<ResultPanel post={{ ...post, result: { spend: 1500, bookings: 10, engagement: 300 } }} benchmarks={B} onChange={() => {}} />)
  expect(screen.getByText(/150 جنيه/)).toBeTruthy()
  expect(screen.getByText(/أعلى من المنافسين/)).toBeTruthy()
})

test('a negative number shows an Arabic warning', () => {
  render(<ResultPanel post={{ ...post, result: { reach: -3 } }} benchmarks={B} onChange={() => {}} />)
  expect(screen.getByRole('alert').textContent).toMatch(/[؀-ۿ]/)
})

test('a post that is not published yet says results come after publishing', () => {
  render(<ResultPanel post={{ ...post, status: 'ready' }} benchmarks={B} onChange={() => {}} />)
  expect(screen.getByText(/بعد ما البوست يتنشر/)).toBeTruthy()
})
