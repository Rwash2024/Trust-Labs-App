import { validatePackage, MAX_PACKAGE_NAME } from './pkg.js'

test('both blank means no package, and that is fine', () => {
  expect(validatePackage({ name: '', price: '' })).toEqual({ ok: true, pkg: null })
  expect(validatePackage({})).toEqual({ ok: true, pkg: null })
  expect(validatePackage({ name: '   ', price: '' })).toEqual({ ok: true, pkg: null })
})

test('a name alone is allowed; price becomes null', () => {
  expect(validatePackage({ name: ' باقة الشتاء ', price: '' })).toEqual({ ok: true, pkg: { name: 'باقة الشتاء', price: null } })
})

test('name plus price gives a numeric price', () => {
  expect(validatePackage({ name: 'باقة الشتاء', price: '1200' })).toEqual({ ok: true, pkg: { name: 'باقة الشتاء', price: 1200 } })
  expect(validatePackage({ name: 'باقة الشتاء', price: 1200 }).pkg.price).toBe(1200)
})

test('a price without a name is rejected with an Arabic message', () => {
  const r = validatePackage({ name: '', price: '500' })
  expect(r.ok).toBe(false)
  expect(r.message).toMatch(/[؀-ۿ]/)
})

test('zero, negative, fractional, non-numeric and absurd prices are rejected', () => {
  for (const price of ['0', '-5', '12.5', 'abc', '99999999', 'Infinity']) {
    const r = validatePackage({ name: 'باقة', price })
    expect(r.ok, String(price)).toBe(false)
    expect(r.message).toMatch(/[؀-ۿ]/)
  }
})

test('a name longer than the limit is rejected', () => {
  expect(validatePackage({ name: 'ا'.repeat(MAX_PACKAGE_NAME) }).ok).toBe(true)
  expect(validatePackage({ name: 'ا'.repeat(MAX_PACKAGE_NAME + 1) }).ok).toBe(false)
})
