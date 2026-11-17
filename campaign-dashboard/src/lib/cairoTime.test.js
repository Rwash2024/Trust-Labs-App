import { cairoStamp } from './cairoTime.js'

test('shows Cairo time (UTC+2 in winter), not UTC', () => {
  expect(cairoStamp('2026-11-17T11:55:51.135925+00:00')).toBe('2026-11-17 13:55')
  expect(cairoStamp('2026-11-20T10:00:00Z')).toBe('2026-11-20 12:00')
})

test('summer time is handled by the time zone rules, not by a fixed offset', () => {
  const summer = cairoStamp('2026-07-15T10:00:00Z')
  expect(summer).toMatch(/^2026-07-15 1[2-3]:00$/)
})

test('a missing or broken value gives an empty string, never throws', () => {
  for (const bad of [undefined, null, '', 'not a date']) expect(cairoStamp(bad)).toBe('')
})
