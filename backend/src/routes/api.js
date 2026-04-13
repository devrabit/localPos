const crypto = require('crypto')
const express = require('express')
const { z } = require('zod')
const defaultWoo = require('../services/wooClient')
const createBarcodeRouter = require('./barcode')
const { createPrintRouter } = require('./print')
const {
  findProductByScanCode,
  getCachedProductList,
  invalidateProductosScanCache,
  normalizeScanCode,
  skuFromEntity,
} = require('../utils/productScan')
const { isVariableProductType } = require('../utils/wooProductType')
const { env } = require('../config/env')

const createCustomerSchema = z.object({
  nombre: z.string().min(2),
  telefono: z.string().optional().default(''),
  email: z.string().optional().default(''),
})

function hostFromWooUrl(wooUrl) {
  if (!wooUrl || typeof wooUrl !== 'string') return ''
  return wooUrl
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .split(':')[0]
    .toLowerCase()
}

function placeholderCustomerEmail() {
  const host = hostFromWooUrl(env.wooUrl)
  const domain = host && !host.includes('localhost') ? host : 'example.com'
  return `naripos.pos.${Date.now()}.${Math.random().toString(36).slice(2, 10)}@${domain}`
}

function newWooUsername() {
  const suffix = crypto.randomBytes(6).toString('hex')
  return `naripos_${Date.now()}_${suffix}`.slice(0, 60)
}

function randomWooPassword() {
  return crypto.randomBytes(18).toString('base64url')
}

const createOrderSchema = z.object({
  cliente: z
    .object({
      id: z.number().int().positive().optional(),
      nombre: z.string().optional().default(''),
      telefono: z.string().optional().default(''),
    })
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variationId: z.number().int().positive().optional(),
        cantidad: z.number().int().positive(),
      }),
    )
    .min(1),
})

function stockFromWooEntity(entity) {
  if (!entity || typeof entity !== 'object') return 0
  const unlimited =
    entity.manage_stock === false &&
    (entity.stock_quantity === null || entity.stock_quantity === undefined)
  return unlimited ? -1 : Number(entity.stock_quantity ?? 0)
}

function mapVariationToDto(v, parentName, parentId) {
  const atributos = {}
  for (const a of v.attributes || []) {
    const key = String(a.name || 'opcion')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/^pa_/, '')
    atributos[key] = a.option
  }
  const label = Object.values(atributos).filter(Boolean).join(' / ')
  return {
    variationId: v.id,
    productId: parentId,
    nombre: label ? `${parentName} - ${label}` : `${parentName} (#${v.id})`,
    precio: Number(v.price || v.regular_price || 0),
    stock: stockFromWooEntity(v),
    sku: skuFromEntity(v),
    atributos,
  }
}

function mapProductDto(p, variaciones = []) {
  const tipo = isVariableProductType(p.type) ? 'variable' : 'simple'
  const dto = {
    id: p.id,
    nombre: p.name,
    tipo,
    precio: Number(p.price || 0),
    stock: stockFromWooEntity(p),
    sku: skuFromEntity(p),
    variaciones,
  }
  if (tipo === 'variable' && variaciones.length) {
    const prices = variaciones.map((x) => x.precio).filter((n) => n > 0)
    if (prices.length) dto.precio = Math.min(...prices)
  }
  return dto
}

function mapCustomer(c) {
  return {
    id: c.id,
    nombre: `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || `Cliente ${c.id}`,
    telefono: c.billing?.phone || '',
  }
}

const ordenesQuerySchema = z.object({
  fechaInicio: z.string().max(32).optional(),
  fechaFin: z.string().max(32).optional(),
  cliente: z.string().max(200).optional().default(''),
  estado: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

function mapOrdenLista(o) {
  return {
    id: o.id,
    cliente: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || '-',
    total: Number(o.total || 0),
    estado: o.status,
    fecha: (o.date_created || '').split('T')[0] || '',
  }
}

function mapOrdenDetalle(o) {
  return {
    id: o.id,
    cliente: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || '-',
    telefono: o.billing?.phone || '',
    email: o.billing?.email || '',
    total: Number(o.total || 0),
    estado: o.status,
    fecha: o.date_created || '',
    metodoPago: o.payment_method_title || o.payment_method || '-',
    items: (o.line_items || []).map((li) => ({
      productId: li.product_id,
      variationId: li.variation_id || null,
      nombre: li.name || `Producto ${li.product_id}`,
      cantidad: li.quantity,
      precio: Number(li.price || 0),
      lineTotal: Number(li.total || 0),
    })),
  }
}

function createApiRouter(woo = defaultWoo) {
  const router = express.Router()

  router.use(createPrintRouter(woo))
  router.use('/barcode', createBarcodeRouter(woo))

  router.get('/productos', async (_req, res, next) => {
    try {
      const products = await woo.fetchProducts()
      res.json(products.map((p) => mapProductDto(p, [])))
    } catch (error) {
      next(error)
    }
  })

  /** Resolucion tipo Woo: SKU simple, SKU variacion, SKU padre variable (usa datos reales de Woo). */
  router.get('/productos/escaneo', async (req, res, next) => {
    try {
      const raw = (req.query.q ?? req.query.codigo ?? '').toString()
      const q = normalizeScanCode(raw)
      if (!q) {
        return res.status(400).json({ error: 'Codigo vacio o invalido' })
      }
      const products = await getCachedProductList(woo)
      const hit = await findProductByScanCode(products, q, (id) => woo.fetchProductVariations(id))
      if (!hit) {
        return res.status(404).json({ error: 'Codigo no encontrado' })
      }
      const { tipo, producto: pw, variacion: vw } = hit
      const dtoP = mapProductDto(pw, [])
      let dtoV = null
      if (vw) {
        dtoV = mapVariationToDto(vw, pw.name, pw.id)
      }
      const sinStock =
        tipo === 'simple'
          ? dtoP.stock === 0
          : tipo === 'variacion'
            ? dtoV && dtoV.stock === 0
            : false
      const resultado =
        tipo === 'simple' ? 'simple' : tipo === 'variacion' ? 'variacion' : 'variable_sin_elegir'
      res.json({
        resultado,
        producto: dtoP,
        variacion: dtoV,
        sinStock,
      })
    } catch (error) {
      next(error)
    }
  })

  router.get('/productos/:productId/variaciones', async (req, res, next) => {
    const productId = Number(req.params.productId)
    if (!Number.isInteger(productId) || productId < 1) {
      return res.status(400).json({ error: 'ID de producto invalido' })
    }
    try {
      const parent = await woo.fetchProductById(productId)
      if (!parent || !isVariableProductType(parent.type)) {
        return res.json({ variaciones: [] })
      }
      let raw = []
      try {
        raw = await woo.fetchProductVariations(productId)
      } catch {
        raw = []
      }
      const variaciones = raw.map((v) => mapVariationToDto(v, parent.name, productId))
      res.json({ variaciones })
    } catch (error) {
      if (error?.response?.status === 404) {
        return res.status(404).json({ error: 'Producto no encontrado' })
      }
      next(error)
    }
  })

  router.get('/clientes', async (_req, res, next) => {
    try {
      const customers = await woo.fetchCustomers()
      res.json(customers.map(mapCustomer))
    } catch (error) {
      next(error)
    }
  })

  router.post('/clientes', async (req, res, next) => {
    try {
      const payload = createCustomerSchema.parse(req.body)
      const [firstName, ...rest] = payload.nombre.trim().split(/\s+/)
      const lastName = rest.join(' ')
      const emailInput = (payload.email || '').trim()
      if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        return res.status(400).json({ error: 'Email no valido' })
      }
      const email = emailInput || placeholderCustomerEmail()

      const customer = await woo.createCustomer({
        email,
        username: newWooUsername(),
        password: randomWooPassword(),
        role: 'customer',
        first_name: firstName || payload.nombre,
        last_name: lastName,
        billing: {
          first_name: firstName || payload.nombre,
          last_name: lastName,
          email,
          phone: payload.telefono || '',
        },
      })

      res.status(201).json(mapCustomer(customer))
    } catch (error) {
      next(error)
    }
  })

  router.get('/ordenes', async (req, res, next) => {
    try {
      const parsed = ordenesQuerySchema.parse(req.query)
      const estado = parsed.estado || ''
      if (estado && !['completed', 'pending', 'cancelled'].includes(estado)) {
        return res.status(400).json({ error: 'Estado invalido' })
      }

      const wooParams = {
        page: parsed.page,
        per_page: parsed.limit,
        orderby: 'date',
        order: 'desc',
      }

      if (parsed.fechaInicio) {
        wooParams.after = `${parsed.fechaInicio}T00:00:00`
      }
      if (parsed.fechaFin) {
        wooParams.before = `${parsed.fechaFin}T23:59:59`
      }

      if (estado === 'pending') {
        wooParams.status = 'pending,processing,on-hold'
      } else if (estado === 'completed') {
        wooParams.status = 'completed'
      } else if (estado === 'cancelled') {
        wooParams.status = 'cancelled,refunded,failed'
      }

      const term = (parsed.cliente || '').trim()
      if (term) {
        if (/^\d+$/.test(term)) {
          wooParams.include = term
        } else {
          wooParams.search = term
        }
      }

      const { orders, total, totalPages } = await woo.fetchOrdersPage(wooParams)

      res.json({
        ordenes: orders.map(mapOrdenLista),
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages,
      })
    } catch (error) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'Parametros de consulta invalidos' })
      }
      next(error)
    }
  })

  router.get('/ordenes/:id', async (req, res, next) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'ID de pedido invalido' })
    }
    try {
      const order = await woo.fetchOrderById(id)
      res.json(mapOrdenDetalle(order))
    } catch (error) {
      if (error?.response?.status === 404) {
        return res.status(404).json({ error: 'Pedido no encontrado' })
      }
      next(error)
    }
  })

  router.post('/orden', async (req, res, next) => {
    try {
      const payload = createOrderSchema.parse(req.body)

      const c = payload.cliente
      const phone = c?.telefono || ''
      const nombre = (c?.nombre || '').trim()

      let firstName = 'POS'
      let lastName = 'Mostrador'
      if (nombre) {
        const parts = nombre.split(/\s+/)
        firstName = parts[0] || nombre
        lastName = parts.slice(1).join(' ') || ''
      } else if (c?.id) {
        firstName = 'Cliente'
        lastName = `POS-${c.id}`
      }

      const orderBody = {
        status: 'completed',
        set_paid: true,
        payment_method: 'cod',
        payment_method_title: 'POS',
        billing: {
          first_name: firstName,
          last_name: lastName,
          phone,
        },
        line_items: payload.items.map((i) => {
          const li = {
            product_id: i.productId,
            quantity: i.cantidad,
          }
          if (i.variationId != null && Number(i.variationId) > 0) {
            li.variation_id = i.variationId
          }
          return li
        }),
      }

      if (c?.id) {
        orderBody.customer_id = c.id
      }

      const order = await woo.createOrder(orderBody)
      invalidateProductosScanCache()

      res.status(201).json({
        orderId: order.id,
        status: order.status,
        total: order.total,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}

module.exports = createApiRouter
