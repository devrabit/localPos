const test = require('node:test')
const assert = require('node:assert')
const { formatWooError } = require('../src/utils/wooErrors')

test('formatWooError usa message string de Woo', () => {
  const err = {
    response: {
      status: 400,
      data: { message: 'invalid_product_id' },
    },
  }
  assert.equal(formatWooError(err), 'invalid_product_id')
})

test('formatWooError concatena errors array', () => {
  const err = {
    response: {
      status: 400,
      data: { errors: [{ message: 'a' }, { message: 'b' }] },
    },
  }
  assert.equal(formatWooError(err), 'a; b')
})

test('formatWooError sin response usa message', () => {
  assert.equal(formatWooError(new Error('network')), 'network')
})
