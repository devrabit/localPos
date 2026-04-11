const express = require('express')
const { z } = require('zod')

const printBodySchema = z.object({
  content: z.string().min(1).max(500_000),
})

const facturaBodySchema = z.object({
  factura_id: z.union([z.string(), z.number()]),
  formato: z.enum(['html']).optional().default('html'),
})

function mapOrderToFactura(o) {
  const billing = o.billing || {}
  const nombre = `${billing.first_name || ''} ${billing.last_name || ''}`.trim() || '-'
  return {
    id: String(o.id),
    fecha: o.date_created || new Date().toISOString(),
    cliente: {
      nombre,
      documento: String(billing.phone || billing.email || ''),
    },
    items: (o.line_items || []).map((li) => ({
      nombre: li.name || `Producto ${li.product_id}`,
      cantidad: Number(li.quantity || 0),
      precio: Number(li.price || 0),
      total: Number(li.total || 0),
    })),
    total: Number(o.total || 0),
    metodo_pago: o.payment_method_title || o.payment_method || 'POS',
  }
}

function postPrintHandler(req, res) {
  try {
    const { content } = printBodySchema.parse(req.body)
    res.json({ ok: true, receivedBytes: content.length })
  } catch (err) {
    if (err?.name === 'ZodError') {
      return res.status(400).json({ error: 'content invalido o faltante' })
    }
    throw err
  }
}

function createPrintRouter(woo) {
  const router = express.Router()

  router.post('/print', postPrintHandler)

  router.post('/print/factura', async (req, res, next) => {
    try {
      const body = facturaBodySchema.parse(req.body)
      const id = Number(body.factura_id)
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ error: 'factura_id invalido' })
      }
      const order = await woo.fetchOrderById(id)
      const factura = mapOrderToFactura(order)
      res.json({ factura, formato: body.formato })
    } catch (error) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ error: 'Payload invalido' })
      }
      if (error?.response?.status === 404) {
        return res.status(404).json({ error: 'Pedido no encontrado' })
      }
      next(error)
    }
  })

  return router
}

module.exports = {
  postPrintHandler,
  createPrintRouter,
  mapOrderToFactura,
}
