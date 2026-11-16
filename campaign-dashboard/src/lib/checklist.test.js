import { MANUAL_ITEMS, readiness, toggleCheck } from './checklist.js'

const idea = { id: 'i1', text: 'Green Friday', createdAt: '2026-11-16' }
const post = (over = {}) => ({ id: 'p', ideaId: 'i1', status: 'ready', ...over })
const ad = (over = {}) => ({ enabled: true, budget: 850, days: 3, regions: ['المهندسين'], ageFrom: 25, ageTo: 55, gender: 'all', ...over })

test('a fresh campaign has every manual item open and is not ready', () => {
  const r = readiness(idea, [post()])
  expect(r.items.filter((i) => !i.auto).length).toBe(MANUAL_ITEMS.length)
  expect(r.items.filter((i) => !i.auto).every((i) => !i.done)).toBe(true)
  expect(r.ready).toBe(false)
  expect(r.done).toBeLessThan(r.total)
})

test('toggleCheck ticks and unticks one item without touching the rest of the idea', () => {
  const ticked = toggleCheck(idea, 'approval')
  expect(ticked.text).toBe('Green Friday')
  expect(readiness(ticked, [post()]).items.find((i) => i.id === 'approval').done).toBe(true)
  const back = toggleCheck(ticked, 'approval')
  expect(readiness(back, [post()]).items.find((i) => i.id === 'approval').done).toBe(false)
})

test('content item follows the posts: done only when every post of the idea is past "idea"', () => {
  const find = (posts) => readiness(idea, posts).items.find((i) => i.id === 'content')
  expect(find([post(), post({ status: 'idea' })]).done).toBe(false)
  expect(find([post(), post({ status: 'published' })]).done).toBe(true)
  expect(find([]).done).toBe(false)
})

test('posts of other ideas are ignored', () => {
  const r = readiness(idea, [post(), post({ ideaId: 'other', status: 'idea' })])
  expect(r.items.find((i) => i.id === 'content').done).toBe(true)
})

test('budgets item: every funded ad needs a real budget', () => {
  const find = (posts) => readiness(idea, posts).items.find((i) => i.id === 'budgets').done
  expect(find([post({ ad: ad() })])).toBe(true)
  expect(find([post({ ad: ad({ budget: null }) })])).toBe(false)
  expect(find([post({ ad: ad({ budget: 0 }) })])).toBe(false)
  expect(find([post({ ad: ad({ enabled: false, budget: null }) })])).toBe(true)
  expect(find([post()])).toBe(true)
})

test('ready only when all items are done', () => {
  let i = idea
  for (const m of MANUAL_ITEMS) i = toggleCheck(i, m.id)
  const r = readiness(i, [post({ ad: ad() })])
  expect(r.ready).toBe(true)
  expect(r.done).toBe(r.total)
})

test('unknown ids in a saved checklist are ignored', () => {
  const r = readiness({ ...idea, checklist: { nonsense: true } }, [post()])
  expect(r.done).toBeLessThan(r.total)
})
