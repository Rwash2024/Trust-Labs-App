export function testToCartItem(test) {
  return { id: `test-${test.code}`, name: test.name, price: test.price, testCount: 1, tests: [test.name] }
}
