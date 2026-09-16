const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')

function minimalMockWoo() {
  return {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
}

function buildAppWithMemoryPedidos() {
  const { stubPedidosStorageInCache } = require('./helpers/memoryPedidosStorage')
  stubPedidosStorageInCache()
  const createApiRouterFresh = require('../src/routes/api')
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouterFresh(minimalMockWoo()))
  app.use((error, _req, res, _next) => {
    if (error?.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request payload' })
    }
    res.status(500).json({ error: error?.message || 'fail' })
  })
  return app
}

test('pedidos: crear, editar con PUT y conservar estado/fecha', async (t) => {
  const { clearPedidosStorageStub } = require('./helpers/memoryPedidosStorage')
  t.after(() => {
    clearPedidosStorageStub()
  })
  const app = buildAppWithMemoryPedidos()

  const cre = await request(app)
    .post('/api/pedidos')
    .send({
      dirigidoA: 'Proveedor A',
      items: [
        { nombreProducto: 'Prod 1', referencia: 'R1', cantidad: 2, descripcion: 'a' },
        { nombreProducto: 'Prod 2', referencia: 'R2', cantidad: 1 },
      ],
    })
    .expect(201)

  assert.ok(cre.body.id)
  assert.equal(cre.body.estado, 'en_proceso')
  assert.equal(cre.body.itemCount, 2)
  assert.equal(cre.body.unidades, 3)
  const fechaOriginal = cre.body.fechaCreacion
  const id = cre.body.id

  await request(app)
    .patch(`/api/pedidos/${id}`)
    .send({ estado: 'enviado_al_proveedor' })
    .expect(200)

  const put = await request(app)
    .put(`/api/pedidos/${id}`)
    .send({
      dirigidoA: 'Proveedor B',
      items: [
        { nombreProducto: 'Prod 1', referencia: 'R1', cantidad: 5, descripcion: 'actualizado' },
        { nombreProducto: 'Prod 3', referencia: 'R3', cantidad: 4 },
      ],
    })
    .expect(200)

  assert.equal(put.body.dirigidoA, 'Proveedor B')
  assert.equal(put.body.estado, 'enviado_al_proveedor')
  assert.equal(put.body.fechaCreacion, fechaOriginal)
  assert.equal(put.body.itemCount, 2)
  assert.equal(put.body.unidades, 9)
  assert.equal(put.body.items.length, 2)
  assert.ok(put.body.items.every((it) => it.id))

  const get = await request(app).get(`/api/pedidos/${id}`).expect(200)
  assert.equal(get.body.dirigidoA, 'Proveedor B')
  assert.equal(get.body.estado, 'enviado_al_proveedor')
  assert.equal(get.body.items.find((i) => i.referencia === 'R3')?.cantidad, 4)
  assert.equal(get.body.items.some((i) => i.referencia === 'R2'), false)
})

test('PUT /api/pedidos/:id inexistente → 404', async (t) => {
  const { clearPedidosStorageStub } = require('./helpers/memoryPedidosStorage')
  t.after(() => {
    clearPedidosStorageStub()
  })
  const app = buildAppWithMemoryPedidos()
  await request(app)
    .put('/api/pedidos/no-existe')
    .send({
      dirigidoA: 'X',
      items: [{ nombreProducto: 'P', referencia: 'R', cantidad: 1 }],
    })
    .expect(404)
})

test('PUT /api/pedidos/:id sin items → 400', async (t) => {
  const { clearPedidosStorageStub } = require('./helpers/memoryPedidosStorage')
  t.after(() => {
    clearPedidosStorageStub()
  })
  const app = buildAppWithMemoryPedidos()
  const cre = await request(app)
    .post('/api/pedidos')
    .send({
      dirigidoA: 'Proveedor',
      items: [{ nombreProducto: 'P', referencia: 'R', cantidad: 1 }],
    })
    .expect(201)

  const res = await request(app)
    .put(`/api/pedidos/${cre.body.id}`)
    .send({ dirigidoA: 'Proveedor', items: [] })
    .expect(400)
  assert.ok(res.body.error)
})

test('PUT /api/pedidos/:id dirigido vacio → 400', async (t) => {
  const { clearPedidosStorageStub } = require('./helpers/memoryPedidosStorage')
  t.after(() => {
    clearPedidosStorageStub()
  })
  const app = buildAppWithMemoryPedidos()
  const cre = await request(app)
    .post('/api/pedidos')
    .send({
      dirigidoA: 'Proveedor',
      items: [{ nombreProducto: 'P', referencia: 'R', cantidad: 1 }],
    })
    .expect(201)

  await request(app)
    .put(`/api/pedidos/${cre.body.id}`)
    .send({
      dirigidoA: '   ',
      items: [{ nombreProducto: 'P', referencia: 'R', cantidad: 1 }],
    })
    .expect(400)
})
