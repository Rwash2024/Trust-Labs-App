import { bankEngine, buildChatPrompt } from './engine.js'
import { emptyDb } from './storage.js'

test('bankEngine resolves empty list for empty db', async () => {
  expect(await bankEngine(emptyDb()).generate({ idea: 'x', month: '2026-12', mix: {} })).toEqual([])
})

test('buildChatPrompt includes idea, month, competitors, schema and no-promises rule', () => {
  const p = buildChatPrompt({
    idea: 'حملة ضغط الدم', month: '2026-12', mix: { post: 4 },
    competitors: [{ name: 'المختبر' }, { name: 'NSA' }], insights: ['الثقة تكسب'],
  })
  for (const s of ['حملة ضغط الدم', '2026-12', 'المختبر', 'NSA', '"schemaVersion": 1', 'no medical promises', 'الثقة تكسب']) {
    expect(p).toContain(s)
  }
})
