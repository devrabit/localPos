const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createBarcodeRouter = require('../src/routes/barcode')

function buildApp(woo) {
  const app = express()
  app.use(express.json())
  app.use('/api/barcode', createBarcodeRouter(woo))
  app.use((error, _req, res, _next) => {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' })
    }
    res.status(500).json({ error: error?.message || 'fail' })
  })
  return app
}

test('POST /api/barcode/generate CODE128 devuelve imagen base64', async () => {
  const res = await request(buildApp({}))
    .post('/api/barcode/generate')
    .send({ text: 'SC-000123', type: 'CODE128' })
    .expect(200)

  assert.match(res.body.image, /^data:image\/png;base64,/)
  assert.ok(res.body.id)
  assert.equal(res.body.type, 'CODE128')
})

test('POST /api/barcode/generate EAN13 valido', async () => {
  const res = await request(buildApp({}))
    .post('/api/barcode/generate')
    .send({ text: '4006381333931', type: 'EAN13' })
    .expect(200)

  assert.match(res.body.image, /^data:image\/png;base64,/)
  assert.equal(res.body.barcode, '4006381333931')
})

test('POST /api/barcode/generate EAN13 invalido 400', async () => {
  const res = await request(buildApp({}))
    .post('/api/barcode/generate')
    .send({ text: '123', type: 'EAN13' })
    .expect(400)

  assert.ok(res.body.error)
})

test('GET /api/barcode/:id despues de generar', async () => {
  const app = buildApp({})
  const gen = await request(app).post('/api/barcode/generate').send({ text: 'ABC', type: 'CODE128' }).expect(200)

  const res = await request(app).get(`/api/barcode/${gen.body.id}`).expect(200)
  assert.equal(res.body.barcode, 'ABC')
  assert.match(res.body.image, /^data:image\/png;base64,/)
})

test('POST /api/barcode/print con uuid valido', async () => {
  const app = buildApp({})
  const gen = await request(app).post('/api/barcode/generate').send({ text: 'X', type: 'CODE128' }).expect(200)

  const res = await request(app)
    .post('/api/barcode/print')
    .send({ barcode_id: gen.body.id, copies: 2 })
    .expect(200)

  assert.equal(res.body.ok, true)
  assert.equal(res.body.copies, 2)
})

test('POST /api/barcode/sync-product con mock woo', async () => {
  const woo = {
    updateProductSku: async (id, sku) => {
      assert.equal(id, 1)
      assert.equal(sku, 'SC-000123')
      return { id: 1, sku: 'SC-000123' }
    },
  }
  const res = await request(buildApp(woo))
    .post('/api/barcode/sync-product')
    .send({ productId: 1, barcode: 'SC-000123', type: 'CODE128' })
    .expect(200)

  assert.equal(res.body.ok, true)
  assert.equal(res.body.sku, 'SC-000123')
})
