import { buildChatPrompt } from './engine.js'

const base = { idea: 'عروض الشتاء', month: '2026-12', mix: { post: 4 }, competitors: [{ name: 'المختبر' }], insights: ['x'] }

test('the copied prompt carries the package name and price when there is one', () => {
  const p = buildChatPrompt({ ...base, pkg: { name: 'باقة الشتاء', price: 1200 } })
  expect(p).toContain('باقة الشتاء')
  expect(p).toMatch(/1,200/)
})

test('without a package the prompt has no package line', () => {
  expect(buildChatPrompt(base)).not.toContain('اسم الباقة')
  expect(buildChatPrompt({ ...base, pkg: null })).not.toContain('اسم الباقة')
})
