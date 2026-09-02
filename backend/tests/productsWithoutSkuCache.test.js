const test = require('node:test')
const assert = require('node:assert')
const { invalidateProductosScanCache } = require('../src/utils/productScan')
const {
  getProductsWithoutSkuPage,
  invalidateSinSkuCache,
} = require('../src/utils/productsWithoutSku')

test.beforeEach(() => {
  invalidateProductosScanCache()
  invalidateSinSkuCache()
})

test('getProductsWithoutSkuPage cachea la pagina y no vuelve a Woo', async () => {
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

  const first = await getProductsWithoutSkuPage(woo)
  const second = await getProductsWithoutSkuPage(woo)

  assert.equal(first.total, 1)
  assert.equal(second.total, 1)
  assert.equal(fetchProductsCalls, 1)
  assert.equal(fetchVariationsCalls, 0)
})

test('getProductsWithoutSkuPage limita las variaciones consultadas a la pagina', async () => {
  const pedidas = []
  const woo = {
    fetchProducts: async () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        type: 'variable',
        name: `P${i + 1}`,
        price: '0',
        sku: '',
        manage_stock: false,
      })),
    fetchProductVariations: async (pid) => {
      pedidas.push(pid)
      return []
    },
  }

  const primera = await getProductsWithoutSkuPage(woo, { page: 1, limit: 2 })
  assert.deepEqual(pedidas, [1, 2])
  assert.equal(primera.totalPages, 3)
  assert.equal(primera.hasMore, true)

  const segunda = await getProductsWithoutSkuPage(woo, { page: 2, limit: 2 })
  assert.deepEqual(pedidas, [1, 2, 3, 4])
  assert.equal(segunda.page, 2)
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

  await getProductsWithoutSkuPage(woo)
  invalidateSinSkuCache()
  invalidateProductosScanCache()
  await getProductsWithoutSkuPage(woo)

  assert.equal(fetchProductsCalls, 2)
})
