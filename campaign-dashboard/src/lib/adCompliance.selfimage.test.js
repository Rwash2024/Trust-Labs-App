import { checkAdCopy } from './adCompliance.js'

const base = { headline: 'اطمّن على صحتك', caption: 'زيارة منزلية مجانية. اسأل واحجز.', panelService: 'باقات الاطمئنان', panelBullets: ['a', 'b', 'c', 'd'] }
const ids = (over) => checkAdCopy({ ...base, ...over }).issues.map((i) => i.id)

test('talking to the reader about his weight or looks is flagged (Meta negative self-perception rule)', () => {
  expect(ids({ headline: 'وزنك زايد؟' })).toContain('selfimage')
  expect(ids({ caption: 'شكلك تعبان؟ اسأل واحجز' })).toContain('selfimage')
  expect(ids({ caption: 'كرشك كبر، افحص' })).toContain('selfimage')
  expect(ids({ panelBullets: ['جسمك وحش', 'b', 'c', 'd'] })).toContain('selfimage')
})

test('neutral wording about weight in general is not flagged', () => {
  expect(ids({ caption: 'الوزن والطاقة من أسباب الفحص الدوري. افحص واطمّن.' })).not.toContain('selfimage')
  expect(ids({})).toEqual([])
})

test('the message is Arabic and says what to do', () => {
  const issue = checkAdCopy({ ...base, headline: 'وزنك زايد؟' }).issues.find((i) => i.id === 'selfimage')
  expect(issue.message).toMatch(/[؀-ۿ]/)
  expect(issue.message.length).toBeGreaterThan(20)
})
