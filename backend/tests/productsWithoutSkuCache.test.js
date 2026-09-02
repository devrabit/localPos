const test = require('node:test')
const assert = require('node:assert')
const { invalidateProductosScanCache } = require('../src/utils/productScan')
const {
  getProductsWithoutSkuResponse,
  invalidateSinSkuCache,
} = require('../src/utils/productsWithoutSku')

test.beforeEach(() => {
  invalidateProductosScanCache()
  invalidateSinSkuCache()
})

test('getProductsWithoutSkuResponse cachea y reutiliza sin volver a Woo', async () => {
  let fetchProductsCalls = 0
  let fetchVariationsCalls = 0
  const woo = {
    fetchProducts: async () => {
      fetchProductsCalls += 1
      return [
        { id: 1, type: 'simple', name: 'A', price: '1', sku: '', manage_stock: true, stock_quantity: 1 },
      ]
    },
    fetchProductVariations: async () => {
      fetchVariationsCalls += 1
      return []
    },
  }

  const first = await getProductsWithoutSkuResponse(woo)
  const second = await getProductsWithoutSkuResponse(woo)

  assert.equal(first.total, 1)
  assert.equal(second.total, 1)
  assert.equal(fetchProductsCalls, 1)
  assert.equal(fetchVariationsCalls, 0)
})

test('invalidateSinSkuCache con invalidateProductosScanCache fuerza reconstruccion', async () => {
  let fetchProductsCalls = 0
  const woo = {
    fetchProducts: async () => {
      fetchProductsCalls += 1
      return [{ id: 2, type: 'simple', name: 'B', price: '2', sku: '', manage_stock: true, stock_quantity: 1 }]
    },
    fetchProductVariations: async () => [],
  }

  await getProductsWithoutSkuResponse(woo)
  invalidateSinSkuCache()
  invalidateProductosScanCache()
  await getProductsWithoutSkuResponse(woo)

  assert.equal(fetchProductsCalls, 2)
})
