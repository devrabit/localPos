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

const baseWoo = {
  fetchProducts: async () => [],
  fetchCustomers: async () => [],
  createCustomer: async () => ({}),
  createOrder: async () => ({}),
}

test('GET /api/ordenes devuelve paginacion y resumen', async () => {
  let capturedParams
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async (params) => {
      capturedParams = params
      return {
        orders: [
          {
            id: 10,
            billing: { first_name: 'Juan', last_name: 'Perez' },
            total: '99.5',
            status: 'completed',
            date_created: '2026-03-29T12:00:00',
          },
        ],
        total: 25,
        totalPages: 2,
      }
    },
    fetchOrderById: async () => ({}),
  }
  const res = await request(buildApp(mockWoo))
    .get('/api/ordenes')
    .query({ page: 2, limit: 10 })
    .expect(200)

  assert.equal(res.body.ordenes.length, 1)
  assert.equal(res.body.ordenes[0].cliente, 'Juan Perez')
  assert.equal(res.body.ordenes[0].total, 99.5)
  assert.equal(res.body.page, 2)
  assert.equal(res.body.limit, 10)
  assert.equal(res.body.total, 25)
  assert.equal(res.body.totalPages, 2)
  assert.equal(capturedParams.page, 2)
  assert.equal(capturedParams.per_page, 10)
})

test('GET /api/ordenes filtra por estado pending', async () => {
  let capturedParams
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async (params) => {
      capturedParams = params
      return { orders: [], total: 0, totalPages: 1 }
    },
    fetchOrderById: async () => ({}),
  }
  await request(buildApp(mockWoo)).get('/api/ordenes').query({ estado: 'pending' }).expect(200)
  assert.equal(capturedParams.status, 'pending,processing,on-hold')
})

test('GET /api/ordenes include cuando cliente es numerico', async () => {
  let capturedParams
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async (params) => {
      capturedParams = params
      return { orders: [], total: 0, totalPages: 1 }
    },
    fetchOrderById: async () => ({}),
  }
  await request(buildApp(mockWoo)).get('/api/ordenes').query({ cliente: '555' }).expect(200)
  assert.equal(capturedParams.include, '555')
})

test('GET /api/ordenes rechaza estado invalido', async () => {
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async () => ({ orders: [], total: 0, totalPages: 1 }),
    fetchOrderById: async () => ({}),
  }
  await request(buildApp(mockWoo)).get('/api/ordenes').query({ estado: 'foo' }).expect(400)
})

test('GET /api/ordenes/:id devuelve detalle', async () => {
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async () => ({ orders: [], total: 0, totalPages: 1 }),
    fetchOrderById: async (id) => ({
      id,
      billing: { first_name: 'A', last_name: 'B', phone: '1', email: 'a@b.com' },
      total: '20',
      status: 'completed',
      date_created: '2026-01-01T00:00:00',
      payment_method_title: 'POS',
      line_items: [
        {
          product_id: 3,
          name: 'Producto X',
          quantity: 2,
          price: '10',
          total: '20',
        },
      ],
    }),
  }
  const res = await request(buildApp(mockWoo)).get('/api/ordenes/3').expect(200)
  assert.equal(res.body.id, 3)
  assert.equal(res.body.items.length, 1)
  assert.equal(res.body.items[0].nombre, 'Producto X')
  assert.equal(res.body.metodoPago, 'POS')
})

test('GET /api/ordenes/:id 404', async () => {
  const mockWoo = {
    ...baseWoo,
    fetchOrdersPage: async () => ({ orders: [], total: 0, totalPages: 1 }),
    fetchOrderById: async () => {
      const err = new Error('nf')
      err.response = { status: 404 }
      throw err
    },
  }
  await request(buildApp(mockWoo)).get('/api/ordenes/999').expect(404)
})
