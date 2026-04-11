const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createApiRouter = require('../src/routes/api')
const { postPrintHandler } = require('../src/routes/print')

function buildApp(mockWoo) {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.post('/print', postPrintHandler)
  app.use('/api', createApiRouter(mockWoo))
  app.use((error, _req, res, _next) => {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' })
    }
    res.status(500).json({ error: error?.message || 'fail' })
  })
  return app
}

test('POST /print acepta HTML y responde ok', async () => {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.post('/print', postPrintHandler)
  const res = await request(app).post('/print').send({ content: '<html><body>x</body></html>' }).expect(200)
  assert.equal(res.body.ok, true)
  assert.ok(res.body.receivedBytes > 0)
})

test('POST /api/print mismo comportamiento', async () => {
  const mockWoo = { fetchProducts: async () => [] }
  const res = await request(buildApp(mockWoo))
    .post('/api/print')
    .send({ content: '<p>factura</p>' })
    .expect(200)
  assert.equal(res.body.ok, true)
})

test('POST /api/print/factura devuelve modelo factura', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchOrderById: async (id) => ({
      id,
      date_created: '2026-01-01T12:00:00',
      total: '99.50',
      payment_method: 'cod',
      payment_method_title: 'POS',
      billing: { first_name: 'Ana', last_name: 'Lopez', phone: '300' },
      line_items: [
        { name: 'Item A', product_id: 1, quantity: 2, price: '10', total: '20' },
      ],
    }),
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/print/factura')
    .send({ factura_id: 5, formato: 'html' })
    .expect(200)
  assert.equal(res.body.factura.id, '5')
  assert.equal(res.body.factura.items.length, 1)
  assert.equal(res.body.factura.cliente.nombre, 'Ana Lopez')
})
