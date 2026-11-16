import { summarizePosting } from './postingStats.js'

const comp = (name, hours, days) => ({
  name,
  posting: { n: hours.reduce((a, h) => a + h.count, 0), topHours: hours, topDays: days },
})

test('sums hours and days across competitors and ranks the busiest', () => {
  const s = summarizePosting([
    comp('a', [{ hour: 16, count: 4 }, { hour: 18, count: 1 }], [{ day: 'الأربعاء', count: 3 }]),
    comp('b', [{ hour: 16, count: 2 }, { hour: 9, count: 1 }], [{ day: 'الأربعاء', count: 1 }, { day: 'الأحد', count: 2 }]),
  ])
  expect(s.hourCounts[16]).toBe(6)
  expect(s.busiestHours[0]).toBe(16)
  expect(s.busiestDays[0]).toEqual({ day: 'الأربعاء', count: 4 })
  expect(s.totalPosts).toBe(8)
})

test('evening share counts posts from 19:00 onward', () => {
  const s = summarizePosting([comp('a', [{ hour: 20, count: 1 }, { hour: 14, count: 3 }], [])])
  expect(s.eveningShare).toBeCloseTo(0.25)
})

test('competitors without posting data are ignored and empty input does not crash', () => {
  const s = summarizePosting([{ name: 'x', sample: {} }, comp('a', [{ hour: 10, count: 2 }], [])])
  expect(s.totalPosts).toBe(2)
  const e = summarizePosting([])
  expect(e.totalPosts).toBe(0)
  expect(e.eveningShare).toBe(0)
  expect(e.busiestHours).toEqual([])
})
