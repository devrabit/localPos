const test = require('node:test')
const assert = require('node:assert')
const { findProductsWithoutSku } = require('../src/utils/productsWithoutSku')

test('findProductsWithoutSku incluye simple sin sku y variacion sin sku', async () => {
  const products = [
    { id: 1, type: 'simple', name: 'A', price: '1', sku: '', manage_stock: true, stock_quantity: 1 },
    { id: 2, type: 'simple', name: 'B', price: '2', sku: 'X', manage_stock: true, stock_quantity: 1 },
    { id: 3, type: 'variable', name: 'V', price: '0', sku: '', manage_stock: false },
  ]
  const items = await findProductsWithoutSku(products, async (pid) => {
    assert.equal(pid, 3)
    return [
      { id: 30, price: '3', sku: '', manage_stock: true, stock_quantity: 1, attributes: [{ option: 'S' }] },
      { id: 31, price: '4', sku: 'VS', manage_stock: true, stock_quantity: 1, attributes: [{ option: 'M' }] },
    ]
  })
  assert.equal(items.length, 3)
  assert.ok(items.some((i) => i.tipo === 'simple' && i.productId === 1))
  assert.ok(items.some((i) => i.tipo === 'variacion' && i.variationId === 30))
  assert.ok(items.some((i) => i.tipo === 'variable' && i.productId === 3))
})

test('findProductsWithoutSku respeta meta _sku en variacion', async () => {
  const products = [{ id: 5, type: 'variable', name: 'Padre', price: '0', sku: '' }]
  const items = await findProductsWithoutSku(products, async () => [
    {
      id: 50,
      price: '1',
      sku: '',
      meta_data: [{ key: '_sku', value: 'META-50' }],
      manage_stock: true,
      stock_quantity: 1,
      attributes: [],
    },
  ])
  assert.equal(items.length, 1)
  assert.equal(items[0].tipo, 'variable')
})
