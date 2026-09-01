/** El TTL se lee al cargar el modulo: se fija antes del require para poder vencer la cache. */
process.env.NARIPOS_SCAN_CACHE_MS = '1'

const test = require('node:test')
const assert = require('node:assert')
const {
  getCachedProductList,
  invalidateProductosScanCache,
  warmProductosScanCache,
} = require('../src/utils/productScan')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

test('la cache vencida devuelve la copia vieja y refresca en segundo plano', async () => {
  invalidateProductosScanCache()
  let llamadas = 0
  const woo = {
    fetchProducts: async () => {
      llamadas += 1
      if (llamadas > 1) await sleep(40)
      return [{ id: llamadas, type: 'simple', sku: `S-${llamadas}` }]
    },
  }

  const primera = await getCachedProductList(woo)
  assert.equal(primera[0].id, 1)

  await sleep(10)
  const segunda = await getCachedProductList(woo)
  assert.equal(segunda[0].id, 1, 'no espera al refresco: sirve la copia vieja')
  assert.equal(llamadas, 2, 'el refresco se dispara en segundo plano')

  await sleep(80)
  const tercera = await getCachedProductList(woo)
  assert.equal(tercera[0].id, 2, 'el refresco de fondo actualizo la cache')
})

test('sin cache previa se espera al listado', async () => {
  invalidateProductosScanCache()
  const woo = { fetchProducts: async () => [{ id: 9, type: 'simple', sku: 'S-9' }] }
  const lista = await getCachedProductList(woo)
  assert.equal(lista[0].id, 9)
})

test('refrescos simultaneos comparten una sola peticion a Woo', async () => {
  invalidateProductosScanCache()
  let llamadas = 0
  const woo = {
    fetchProducts: async () => {
      llamadas += 1
      await sleep(20)
      return [{ id: 1, type: 'simple', sku: 'S-1' }]
    },
  }
  await Promise.all([getCachedProductList(woo), getCachedProductList(woo), getCachedProductList(woo)])
  assert.equal(llamadas, 1)
})

test('warmProductosScanCache no propaga errores de Woo', async () => {
  invalidateProductosScanCache()
  const woo = {
    fetchProducts: async () => {
      throw new Error('Woo caido')
    },
  }
  assert.equal(await warmProductosScanCache(woo), null)
})
