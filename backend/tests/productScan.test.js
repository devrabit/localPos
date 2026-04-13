const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createApiRouter = require('../src/routes/api')
const { normalizeScanCode, findProductByScanCode, invalidateProductosScanCache } = require('../src/utils/productScan')

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
