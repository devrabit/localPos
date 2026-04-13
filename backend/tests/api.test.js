const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createApiRouter = require('../src/routes/api')

function buildApp(mockWoo) {
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter(mockWoo))
  app.use((error, _req, res, _next) => {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' })
    }
    res.status(500).json({ error: error?.message || 'fail' })
  })
  return app
}

test('GET /api/productos incluye tipo y variaciones vacias para simple', async () => {
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 1,
        type: 'simple',
        name: 'Producto',
        price: '10.5',
        stock_quantity: 5,
        sku: 'S1',
        manage_stock: true,
      },
    ],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/productos').expect(200)
  assert.equal(res.body.length, 1)
  assert.deepEqual(res.body[0], {
    id: 1,
    nombre: 'Producto',
    tipo: 'simple',
    precio: 10.5,
    stock: 5,
    sku: 'S1',
    variaciones: [],
  })
})

test('GET /api/productos variable deja variaciones vacias (lazy, resuelve escaneo por API)', async () => {
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 10,
        type: 'variable',
        name: 'Camiseta',
        price: '0',
        sku: 'C1',
        manage_stock: false,
        stock_quantity: null,
      },
    ],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/productos').expect(200)
  assert.equal(res.body.length, 1)
  assert.equal(res.body[0].tipo, 'variable')
  assert.deepEqual(res.body[0].variaciones, [])
})

test('GET /api/productos/:id/variaciones carga variaciones bajo demanda', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchProductById: async (pid) => {
      assert.equal(pid, 10)
      return {
        id: 10,
        type: 'variable',
        name: 'Camiseta',
      }
    },
    fetchProductVariations: async (pid) => {
      assert.equal(pid, 10)
      return [
        {
          id: 101,
          price: '25',
          regular_price: '25',
          sku: 'C1-R',
          manage_stock: true,
          stock_quantity: 3,
          attributes: [{ name: 'Color', option: 'Rojo' }],
        },
      ]
    },
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/productos/10/variaciones').expect(200)
  assert.equal(res.body.variaciones.length, 1)
  assert.equal(res.body.variaciones[0].variationId, 101)
  assert.equal(res.body.variaciones[0].precio, 25)
})

test('GET /api/productos/:id/variaciones simple devuelve vacio', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchProductById: async () => ({
      id: 1,
      type: 'simple',
      name: 'X',
    }),
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/productos/1/variaciones').expect(200)
  assert.deepEqual(res.body.variaciones, [])
})

test('POST /api/orden envia customer_id cuando cliente tiene id', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async (body) => {
      captured = body
      return { id: 100, status: 'completed', total: '20.00' }
    },
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      cliente: { id: 42, nombre: 'Juan Perez', telefono: '300' },
      items: [{ productId: 1, cantidad: 2 }],
    })
    .expect(201)

  assert.equal(res.body.orderId, 100)
  assert.equal(captured.customer_id, 42)
  assert.equal(captured.line_items[0].product_id, 1)
  assert.ok(!captured.line_items[0].variation_id)
})

test('POST /api/orden envia variation_id', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async (body) => {
      captured = body
      return { id: 101, status: 'completed', total: '30.00' }
    },
  }
  await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      items: [{ productId: 1, variationId: 55, cantidad: 1 }],
    })
    .expect(201)

  assert.equal(captured.line_items[0].variation_id, 55)
  assert.equal(captured.line_items[0].product_id, 1)
})

test('POST /api/orden rechaza body invalido', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({ cliente: { nombre: 'x' }, items: [] })
    .expect(400)
})

test('POST /api/clientes envia email a WooCommerce', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async (body) => {
      captured = body
      return {
        id: 9,
        first_name: 'Ana',
        last_name: 'Gomez',
        billing: { phone: '300', email: body.email },
      }
    },
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/clientes')
    .send({ nombre: 'Ana Gomez', telefono: '300' })
    .expect(201)

  assert.ok(captured.email)
  assert.ok(String(captured.email).includes('@'))
  assert.ok(captured.username)
  assert.ok(captured.password && captured.password.length >= 8)
  assert.equal(res.body.id, 9)
  assert.equal(res.body.nombre, 'Ana Gomez')
})

test('POST /api/orden sin cliente usa facturacion mostrador', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async (body) => {
      captured = body
      return { id: 200, status: 'completed', total: '10.00' }
    },
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({ items: [{ productId: 5, cantidad: 1 }] })
    .expect(201)

  assert.equal(res.body.orderId, 200)
  assert.equal(captured.billing.first_name, 'POS')
  assert.equal(captured.billing.last_name, 'Mostrador')
  assert.ok(!captured.customer_id)
})
