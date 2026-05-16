const fs = require('fs/promises')
const os = require('os')
const path = require('path')
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
    marca: 'Sin marca',
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
  assert.equal(res.body[0].marca, 'Sin marca')
  assert.deepEqual(res.body[0].variaciones, [])
})

test('GET /api/marcas devuelve marcas que coinciden con q', async () => {
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 1,
        type: 'simple',
        name: 'A',
        price: '1',
        sku: 'S1',
        manage_stock: true,
        stock_quantity: 1,
        attributes: [{ name: 'Marca', slug: 'pa_marca', options: ['Nike Sport'] }],
      },
      {
        id: 2,
        type: 'simple',
        name: 'B',
        price: '2',
        sku: 'S2',
        manage_stock: true,
        stock_quantity: 1,
        attributes: [{ name: 'Marca', slug: 'pa_marca', options: ['Adidas'] }],
      },
    ],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/marcas').query({ q: 'nik' }).expect(200)
  assert.deepEqual(res.body.marcas, ['Nike Sport'])
  const vacio = await request(buildApp(mockWoo)).get('/api/marcas').query({ q: '' }).expect(200)
  assert.deepEqual(vacio.body.marcas, [])
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

test('GET /api/productos/agotados agrupa por marca (simple y variacion)', async () => {
  const mockWoo = {
    fetchProducts: async () => [
      {
        id: 1,
        type: 'simple',
        name: 'Galleta',
        price: '1',
        sku: 'G1',
        manage_stock: true,
        stock_quantity: 0,
        attributes: [{ name: 'Marca', slug: 'pa_marca', options: ['Dulces SA'] }],
      },
      {
        id: 2,
        type: 'simple',
        name: 'Agua',
        price: '2',
        sku: 'A1',
        manage_stock: true,
        stock_quantity: 5,
        attributes: [],
      },
      {
        id: 10,
        type: 'variable',
        name: 'Camiseta',
        sku: 'C-PADRE',
        manage_stock: false,
        stock_quantity: null,
        attributes: [{ name: 'Marca', slug: 'pa_marca', options: ['Textil'] }],
      },
    ],
    fetchProductVariations: async (pid) => {
      assert.equal(pid, 10)
      return [
        {
          id: 101,
          price: '25',
          regular_price: '25',
          sku: 'C1-R',
          manage_stock: true,
          stock_quantity: 0,
          attributes: [{ name: 'Color', option: 'Rojo' }],
        },
        {
          id: 102,
          price: '25',
          regular_price: '25',
          sku: 'C1-A',
          manage_stock: true,
          stock_quantity: 2,
          attributes: [{ name: 'Color', option: 'Azul' }],
        },
      ]
    },
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo)).get('/api/productos/agotados').expect(200)
  assert.equal(res.body.total, 2)
  assert.equal(res.body.grupos.length, 2)
  const marcas = res.body.grupos.map((g) => g.marca).sort()
  assert.deepEqual(marcas, ['Dulces SA', 'Textil'])
  const dulces = res.body.grupos.find((g) => g.marca === 'Dulces SA')
  assert.equal(dulces.items.length, 1)
  assert.equal(dulces.items[0].tipo, 'simple')
  assert.equal(dulces.items[0].productId, 1)
  assert.equal(dulces.items[0].variationId, null)
  const textil = res.body.grupos.find((g) => g.marca === 'Textil')
  assert.equal(textil.items.length, 1)
  assert.equal(textil.items[0].tipo, 'variacion')
  assert.equal(textil.items[0].variationId, 101)
})

test('POST /api/orden envia customer_id cuando cliente tiene id', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    fetchProductById: async (id) => {
      assert.equal(id, 1)
      return { id: 1, price: '10', regular_price: '10' }
    },
    fetchProductVariations: async () => [],
    createOrder: async (body) => {
      captured = body
      return { id: 100, status: 'completed', total: '20.00' }
    },
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      cliente: { id: 42, nombre: 'Juan Perez', telefono: '300' },
      payment_method: 'EFECTIVO',
      cash_received: 25,
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
      payment_method: 'TRANSFERENCIA',
      items: [{ productId: 1, variationId: 55, cantidad: 1 }],
    })
    .expect(201)

  assert.equal(captured.line_items[0].variation_id, 55)
  assert.equal(captured.line_items[0].product_id, 1)
  assert.equal(captured.payment_method, 'bacs')
  assert.equal(captured.payment_method_title, 'Transferencia virtual')
})

test('POST /api/orden efectivo con variacion guarda meta de cambio', async () => {
  let captured
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    fetchProductById: async (id) => {
      assert.equal(id, 1)
      return { id: 1, price: '0', type: 'variable' }
    },
    fetchProductVariations: async (pid) => {
      assert.equal(pid, 1)
      return [{ id: 55, price: '10', regular_price: '10' }]
    },
    createOrder: async (body) => {
      captured = body
      return { id: 101, status: 'completed', total: '10.00' }
    },
  }
  await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      payment_method: 'EFECTIVO',
      cash_received: 15,
      items: [{ productId: 1, variationId: 55, cantidad: 1 }],
    })
    .expect(201)

  assert.equal(captured.line_items[0].variation_id, 55)
  assert.ok(Array.isArray(captured.meta_data))
  const change = captured.meta_data.find((m) => m.key === '_naripos_change')
  assert.equal(change.value, '5')
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
    .send({ cliente: { nombre: 'x' }, payment_method: 'EFECTIVO', items: [] })
    .expect(400)
})

test('POST /api/orden requiere payment_method', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({ items: [{ productId: 1, cantidad: 1 }] })
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
    fetchProductById: async (id) => {
      assert.equal(id, 5)
      return { id: 5, price: '10', regular_price: '10' }
    },
    fetchProductVariations: async () => [],
    createOrder: async (body) => {
      captured = body
      return { id: 200, status: 'completed', total: '10.00' }
    },
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      payment_method: 'EFECTIVO',
      cash_received: 10,
      items: [{ productId: 5, cantidad: 1 }],
    })
    .expect(201)

  assert.equal(res.body.orderId, 200)
  assert.equal(captured.billing.first_name, 'POS')
  assert.equal(captured.billing.last_name, 'Mostrador')
  assert.ok(!captured.customer_id)
  assert.equal(captured.payment_method, 'cod')
  assert.equal(captured.payment_method_title, 'Pago en efectivo')
})

test('POST /api/orden efectivo sin cash_received devuelve 400', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      payment_method: 'EFECTIVO',
      items: [{ productId: 1, cantidad: 1 }],
    })
    .expect(400)
  assert.equal(res.body.error, 'Ingresa el dinero recibido')
})

test('POST /api/orden efectivo con dinero insuficiente devuelve 400', async () => {
  const mockWoo = {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    fetchProductById: async () => ({ id: 1, price: '100', regular_price: '100' }),
    fetchProductVariations: async () => [],
    createOrder: async () => ({}),
  }
  const res = await request(buildApp(mockWoo))
    .post('/api/orden')
    .send({
      payment_method: 'EFECTIVO',
      cash_received: 50,
      items: [{ productId: 1, cantidad: 1 }],
    })
    .expect(400)
  assert.equal(res.body.error, 'El dinero es insuficiente')
})

function minimalMockWoo() {
  return {
    fetchProducts: async () => [],
    fetchCustomers: async () => [],
    createCustomer: async () => ({}),
    createOrder: async () => ({}),
  }
}

function buildAppWithTmpAnnotations(tmpPath) {
  process.env.NARIPOS_ANNOTATIONS_FILE = tmpPath
  delete require.cache[require.resolve('../src/services/annotationsStorage')]
  delete require.cache[require.resolve('../src/routes/api')]
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

test('anotaciones: crear listar detalle comentario eliminar', async (t) => {
  const tmp = path.join(
    os.tmpdir(),
    `naripos_ant_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
  )
  await fs.writeFile(tmp, '[]', 'utf8')
  t.after(async () => {
    delete process.env.NARIPOS_ANNOTATIONS_FILE
    delete require.cache[require.resolve('../src/services/annotationsStorage')]
    delete require.cache[require.resolve('../src/routes/api')]
    try {
      await fs.unlink(tmp)
    } catch {
      /* ok */
    }
  })
  const app = buildAppWithTmpAnnotations(tmp)

  const cre = await request(app)
    .post('/api/anotaciones')
    .send({
      titulo: 'Pedido cliente X',
      cliente: 'Maria',
      recordar: true,
      fechaRecordar: '2026-06-01T10:00',
      marca: 'Acme',
      productoId: 5,
      productoNombre: 'Producto cinco',
      descripcion: 'Llamar cuando llegue',
    })
    .expect(201)

  assert.ok(cre.body.id)
  assert.equal(cre.body.cliente, 'Maria')
  assert.equal(cre.body.recordar, true)

  const list = await request(app).get('/api/anotaciones').expect(200)
  assert.equal(list.body.anotaciones.length, 1)
  assert.equal(list.body.anotaciones[0].titulo, 'Pedido cliente X')

  const id = cre.body.id
  await request(app).get(`/api/anotaciones/${id}`).expect(200)

  await request(app)
    .post(`/api/anotaciones/${id}/comentarios`)
    .send({ texto: 'Ok recibido' })
    .expect(201)

  const det2 = await request(app).get(`/api/anotaciones/${id}`).expect(200)
  assert.equal(det2.body.comentarios.length, 1)

  await request(app).delete(`/api/anotaciones/${id}`).expect(204)
  await request(app).get(`/api/anotaciones/${id}`).expect(404)
})

test('POST /api/anotaciones sin recordar no guarda fechaRecordar', async (t) => {
  const tmp = path.join(
    os.tmpdir(),
    `naripos_ant_fd_${Date.now()}_${Math.random().toString(36).slice(2)}.json`,
  )
  await fs.writeFile(tmp, '[]', 'utf8')
  t.after(async () => {
    delete process.env.NARIPOS_ANNOTATIONS_FILE
    delete require.cache[require.resolve('../src/services/annotationsStorage')]
    delete require.cache[require.resolve('../src/routes/api')]
    try {
      await fs.unlink(tmp)
    } catch {
      /* ok */
    }
  })
  const app = buildAppWithTmpAnnotations(tmp)
  const cre = await request(app)
    .post('/api/anotaciones')
    .send({
      titulo: 'Solo titulo',
      recordar: false,
      fechaRecordar: '2026-06-01T10:00',
      descripcion: '',
    })
    .expect(201)
  assert.equal(cre.body.fechaRecordar, '')
})
