import { dataFreshness } from './freshness.js'
import competitors from '../data/competitors.json'

const DAY = 24 * 60 * 60 * 1000
const now = Date.parse('2026-12-20T12:00:00Z')
const ago = (d) => new Date(now - d * DAY).toISOString().slice(0, 10)

test('recent data is fresh and says how many days old it is', () => {
  const f = dataFreshness(ago(3), now)
  expect(f.level).toBe('fresh')
  expect(f.days).toBe(3)
  expect(f.warning).toBeNull()
})

test('15 to 30 days old is aging, with a warning', () => {
  const f = dataFreshness(ago(20), now)
  expect(f.level).toBe('aging')
  expect(f.warning).toMatch(/[؀-ۿ]/)
})

test('more than 30 days old is stale and tells him to refresh before relying on the numbers', () => {
  const f = dataFreshness(ago(45), now)
  expect(f.level).toBe('stale')
  expect(f.warning).toMatch(/45/)
})

test('the boundaries are 14 (fresh), 15 (aging), 30 (aging), 31 (stale)', () => {
  expect(dataFreshness(ago(14), now).level).toBe('fresh')
  expect(dataFreshness(ago(15), now).level).toBe('aging')
  expect(dataFreshness(ago(30), now).level).toBe('aging')
  expect(dataFreshness(ago(31), now).level).toBe('stale')
})

test('missing, garbage or future dates are unknown and warn, never throw', () => {
  for (const bad of [undefined, null, '', 'not-a-date', new Date(now + 5 * DAY).toISOString()]) {
    const f = dataFreshness(bad, now)
    expect(f.level).toBe('unknown')
    expect(f.warning).toMatch(/[؀-ۿ]/)
  }
})

test('the shipped competitor data carries a valid pull date', () => {
  expect(competitors.pulledAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(Number.isNaN(Date.parse(competitors.pulledAt))).toBe(false)
})
