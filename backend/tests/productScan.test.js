const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createApiRouter = require('../src/routes/api')
const {
  createScanMetrics,
  findProductByScanCode,
  invalidateProductosScanCache,
  normalizeScanCode,
} = require('../src/utils/productScan')

test('normalizeScanCode rechaza caracteres peligrosos', () => {
  assert.equal(normalizeScanCode(''), '')
  assert.equal(normalizeScanCode('  '), '')
  assert.equal(normalizeScanCode('<script>'), '')
  assert.equal(normalizeScanCode('5901234123457'), '5901234123457')
})

test('normalizeScanCode unifica guiones unicode (lector)', () => {
  assert.equal(normalizeScanCode('SC\u2011900000'), 'SC-900000')
})

test('findProductByScanCode simple por sku', async () => {
  const products = [
    {
      id: 1,
      type: 'simple',
      name: 'A',
      price: '10',
      sku: 'SKU-ABC',
      manage_stock: true,
      stock_quantity: 5,
    },
  ]
  const hit = await findProductByScanCode(products, 'SKU-ABC', async () => [])
  assert.ok(hit)
  assert.equal(hit.tipo, 'simple')
  assert.equal(hit.producto.id, 1)
})

test('findProductByScanCode variacion en variable-subscription por sku', async () => {
  const products = [
    {
      id: 10,
      type: 'variable-subscription',
      name: 'Pack',
      price: '0',
      sku: '',
      manage_stock: false,
      stock_quantity: null,
    },
  ]
  const hit = await findProductByScanCode(products, 'SC-900000', async (pid) => {
    assert.equal(pid, 10)
    return [
      {
        id: 101,
        price: '20',
        sku: 'SC-900000',
        manage_stock: true,
        stock_quantity: 2,
        attributes: [{ name: 'Talla', option: 'M' }],
      },
    ]
  })
  assert.ok(hit)
  assert.equal(hit.tipo, 'variacion')
  assert.equal(hit.variacion.id, 101)
})

test('findProductByScanCode sku sin distinguir mayusculas', async () => {
  const products = [
    { id: 1, type: 'simple', name: 'A', price: '1', sku: 'Ab-12', manage_stock: true, stock_quantity: 1 },
  ]
  const hit = await findProductByScanCode(products, 'ab-12', async () => [])
  assert.ok(hit)
  assert.equal(hit.tipo, 'simple')
})

test('findProductByScanCode variacion sku solo en meta _sku', async () => {
  const products = [{ id: 5, type: 'variable', name: 'V', price: '0', sku: '', manage_stock: false }]
  const hit = await findProductByScanCode(products, 'META-SKU', async () => [
    {
      id: 99,
      sku: '',
      price: '5',
      manage_stock: true,
      stock_quantity: 1,
      attributes: [],
      meta_data: [{ key: '_sku', value: 'META-SKU' }],
    },
  ])
  assert.ok(hit)
  assert.equal(hit.tipo, 'variacion')
  assert.equal(hit.variacion.id, 99)
})

test('GET /api/productos/escaneo 404 si no existe', async () => {
  invalidateProductosScanCache()
  const mockWoo = {
    fetchProducts: async () => [
      { id: 1, type: 'simple', name: 'X', price: '1', sku: 'S', manage_stock: true, stock_quantity: 1 },
    ],
    fetchProductVariations: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))
  const res = await request(app).get('/api/productos/escaneo').query({ q: 'NOEXISTE' }).expect(404)
  assert.ok(res.body.error)
})

test('GET /api/productos/escaneo variacion por sku', async () => {
  invalidateProductosScanCache()
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 10,
        type: 'variable',
        name: 'Camiseta',
        price: '0',
        sku: '',
        manage_stock: false,
        stock_quantity: null,
        meta_data: [],
      },
    ],
    fetchProductVariations: async (pid) => {
      assert.equal(pid, 10)
      return [
        {
          id: 101,
          price: '20',
          sku: 'VAR-SKU-1',
          manage_stock: true,
          stock_quantity: 4,
          attributes: [{ name: 'Talla', option: 'M' }],
          meta_data: [],
        },
      ]
    },
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))
  const res = await request(app).get('/api/productos/escaneo').query({ q: 'VAR-SKU-1' }).expect(200)
  assert.equal(res.body.resultado, 'variacion')
  assert.equal(res.body.variacion.variationId, 101)
  assert.equal(res.body.sinStock, false)
})

test('GET /api/productos/escaneo variable-subscription variacion por sku', async () => {
  invalidateProductosScanCache()
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 88,
        type: 'variable-subscription',
        name: 'Suscripcion',
        price: '0',
        sku: '',
        manage_stock: false,
        stock_quantity: null,
      },
    ],
    fetchProductVariations: async (pid) => {
      assert.equal(pid, 88)
      return [
        {
          id: 901,
          price: '15',
          sku: 'SC-900000',
          manage_stock: true,
          stock_quantity: 1,
          attributes: [],
        },
      ]
    },
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))
  const res = await request(app).get('/api/productos/escaneo').query({ q: 'sc-900000' }).expect(200)
  assert.equal(res.body.resultado, 'variacion')
  assert.equal(res.body.variacion.variationId, 901)
})

test('lookup por sku resuelve la variacion sin barrer los padres variables', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 10, type: 'variable', name: 'Camiseta', price: '0', sku: '', manage_stock: false }]
  const metricas = createScanMetrics()
  let barridos = 0
  const hit = await findProductByScanCode(
    products,
    'VAR-1',
    async () => {
      barridos += 1
      return []
    },
    {
      metricas,
      fetchProductsBySku: async (sku) => {
        assert.equal(sku, 'VAR-1')
        return [{ id: 101, type: 'variation', parent_id: 10, sku: 'VAR-1' }]
      },
      fetchVariationById: async (parentId, variationId) => {
        assert.equal(parentId, 10)
        assert.equal(variationId, 101)
        return { id: 101, sku: 'VAR-1', price: '20', manage_stock: true, stock_quantity: 3, attributes: [] }
      },
    },
  )
  assert.ok(hit)
  assert.equal(hit.tipo, 'variacion')
  assert.equal(hit.variacion.id, 101)
  assert.equal(hit.producto.id, 10)
  assert.equal(barridos, 0)
  assert.equal(metricas.origen, 'lookup')
  assert.equal(metricas.peticionesWoo, 2)
})

test('lookup que falla cae al barrido de variaciones', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 10, type: 'variable', name: 'Camiseta', price: '0', sku: '', manage_stock: false }]
  const metricas = createScanMetrics()
  const hit = await findProductByScanCode(
    products,
    'VAR-1',
    async () => [{ id: 101, sku: 'VAR-1', price: '5', manage_stock: true, stock_quantity: 1, attributes: [] }],
    {
      metricas,
      fetchProductsBySku: async () => {
        throw new Error('woo 500')
      },
    },
  )
  assert.ok(hit)
  assert.equal(hit.tipo, 'variacion')
  assert.equal(metricas.origen, 'barrido')
})

test('lookup vacio cae al barrido de variaciones', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 10, type: 'variable', name: 'Camiseta', price: '0', sku: '', manage_stock: false }]
  const metricas = createScanMetrics()
  const hit = await findProductByScanCode(
    products,
    'VAR-2',
    async () => [{ id: 102, sku: 'VAR-2', price: '5', manage_stock: true, stock_quantity: 1, attributes: [] }],
    { metricas, fetchProductsBySku: async () => [] },
  )
  assert.ok(hit)
  assert.equal(hit.tipo, 'variacion')
  assert.equal(metricas.origen, 'barrido')
})

test('lookup resuelve un simple que aun no estaba en la lista cacheada', async () => {
  invalidateProductosScanCache()
  const metricas = createScanMetrics()
  const hit = await findProductByScanCode([], 'S-7', async () => [], {
    metricas,
    fetchProductsBySku: async () => [{ id: 7, type: 'simple', parent_id: 0, sku: 'S-7' }],
    fetchProductById: async (id) => ({
      id,
      type: 'simple',
      name: 'Recien creado',
      price: '9',
      sku: 'S-7',
      manage_stock: true,
      stock_quantity: 2,
    }),
  })
  assert.ok(hit)
  assert.equal(hit.tipo, 'simple')
  assert.equal(hit.producto.id, 7)
  assert.equal(metricas.origen, 'lookup')
})

test('lookup del sku de un padre variable devuelve variable_sin_elegir', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 20, type: 'variable', name: 'Pack', price: '0', sku: 'PACK-1', manage_stock: false }]
  const metricas = createScanMetrics()
  let barridos = 0
  const hit = await findProductByScanCode(
    products,
    'PACK-1',
    async () => {
      barridos += 1
      return []
    },
    {
      metricas,
      fetchProductsBySku: async () => [{ id: 20, type: 'variable', parent_id: 0, sku: 'PACK-1' }],
    },
  )
  assert.ok(hit)
  assert.equal(hit.tipo, 'variable_sin_elegir')
  assert.equal(hit.producto.id, 20)
  assert.equal(barridos, 0)
})

test('las variaciones de un mismo padre se piden una sola vez', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 10, type: 'variable', name: 'Camiseta', price: '0', sku: '', manage_stock: false }]
  let llamadas = 0
  const fetchVariations = async () => {
    llamadas += 1
    return [
      { id: 101, sku: 'V-1', price: '5', manage_stock: true, stock_quantity: 1, attributes: [] },
      { id: 102, sku: 'V-2', price: '6', manage_stock: true, stock_quantity: 1, attributes: [] },
    ]
  }
  const primera = await findProductByScanCode(products, 'V-1', fetchVariations)
  const segunda = await findProductByScanCode(products, 'V-2', fetchVariations)
  assert.equal(primera.variacion.id, 101)
  assert.equal(segunda.variacion.id, 102)
  assert.equal(llamadas, 1)
})

test('un codigo inexistente no repite el barrido (cache negativa)', async () => {
  invalidateProductosScanCache()
  const products = [{ id: 10, type: 'variable', name: 'Camiseta', price: '0', sku: '', manage_stock: false }]
  let llamadas = 0
  const fetchVariations = async () => {
    llamadas += 1
    return []
  }
  assert.equal(await findProductByScanCode(products, 'NOPE-1', fetchVariations), null)
  assert.equal(llamadas, 1)

  const metricas = createScanMetrics()
  assert.equal(await findProductByScanCode(products, 'NOPE-1', fetchVariations, { metricas }), null)
  assert.equal(llamadas, 1)
  assert.equal(metricas.origen, 'cache-negativa')
})

test('GET /api/productos/escaneo expone X-Scan-Ms', async () => {
  invalidateProductosScanCache()
  const mockWoo = {
    fetchProducts: async () => [
      { id: 1, type: 'simple', name: 'X', price: '1', sku: 'S', manage_stock: true, stock_quantity: 1 },
    ],
    fetchProductVariations: async () => [],
  }
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))
  const res = await request(app).get('/api/productos/escaneo').query({ q: 'S' }).expect(200)
  assert.ok(Number.isFinite(Number(res.headers['x-scan-ms'])))
})

test('POST /api/barcode/sync-product invalida la cache del escaneo', async () => {
  invalidateProductosScanCache()
  let listados = 0
  const mockWoo = {
    fetchProducts: async () => {
      listados += 1
      return [
        { id: 1, type: 'simple', name: 'A', price: '1', sku: 'S-1', manage_stock: true, stock_quantity: 1 },
      ]
    },
    fetchProductVariations: async () => [],
    updateProductSku: async () => ({}),
  }
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))

  await request(app).get('/api/productos/escaneo').query({ q: 'S-1' }).expect(200)
  assert.equal(listados, 1)

  await request(app)
    .post('/api/barcode/sync-product')
    .send({ productId: 1, barcode: 'ABC123', type: 'CODE128' })
    .expect(200)

  await request(app).get('/api/productos/escaneo').query({ q: 'S-1' }).expect(200)
  assert.equal(listados, 2)
})
