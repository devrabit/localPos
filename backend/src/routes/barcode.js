const crypto = require('crypto')
const express = require('express')
const bwipjs = require('bwip-js')
const { z } = require('zod')
const { validateBarcodeText } = require('../utils/barcodeValidation')

const generateSchema = z.object({
  text: z.string().min(1).max(200),
  type: z.enum(['CODE128', 'EAN13']),
  scale: z.number().int().min(1).max(12).optional().default(3),
  height: z.number().int().min(5).max(40).optional().default(12),
  includetext: z.boolean().optional().default(true),
  product_id: z.union([z.string(), z.number()]).optional(),
  sku: z.string().max(120).optional(),
})

const printSchema = z.object({
  barcode_id: z.string().uuid(),
  copies: z.number().int().min(1).max(500).optional().default(1),
  printer: z.string().max(120).optional().default('default'),
})

const syncProductSchema = z.object({
  productId: z.number().int().positive(),
  barcode: z.string().min(1).max(200),
  type: z.enum(['CODE128', 'EAN13']),
})

function cacheKey(type, text, scale, height, includetext) {
  return `${type}|${text}|${scale}|${height}|${includetext}`
}

function createBarcodeRouter(woo) {
  const router = express.Router()
  const byId = new Map()
  const imageCache = new Map()

  async function renderPng({ type, text, scale, height, includetext }) {
    const bcid = type === 'EAN13' ? 'ean13' : 'code128'
    const buf = await bwipjs.toBuffer({
      bcid,
      text,
      scale,
      height,
      includetext,
    })
    return buf
  }

  router.post('/generate', async (req, res, next) => {
    try {
      const body = generateSchema.parse(req.body)
      const validated = validateBarcodeText(body.type, body.text)
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error })
      }
      const text = validated.text
      const { scale, height, includetext, type, product_id: productId, sku } = body

      const key = cacheKey(type, text, scale, height, includetext)
      let id = imageCache.get(key)
      let record = id ? byId.get(id) : null

      if (!record) {
        id = crypto.randomUUID()
        let buf
        try {
          buf = await renderPng({ type, text, scale, height, includetext })
        } catch (err) {
          const msg = err?.message || 'Error al generar codigo'
          return res.status(400).json({ error: msg })
        }
        const image = `data:image/png;base64,${buf.toString('base64')}`
        const now = new Date().toISOString()
        record = {
          id,
          product_id: productId != null ? String(productId) : '',
          sku: sku || '',
          barcode: text,
          type,
          image,
          created_at: now,
          updated_at: now,
        }
        byId.set(id, record)
        imageCache.set(key, id)
      } else {
        record.updated_at = new Date().toISOString()
        if (productId != null) record.product_id = String(productId)
        if (sku) record.sku = sku
        byId.set(record.id, record)
      }

      const { image, ...rest } = record
      res.json({
        id: record.id,
        image,
        ...rest,
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/print', async (req, res, next) => {
    try {
      const payload = printSchema.parse(req.body)
      const row = byId.get(payload.barcode_id)
      if (!row) {
        return res.status(404).json({ error: 'Codigo no encontrado' })
      }
      res.json({
        ok: true,
        barcode_id: payload.barcode_id,
        copies: payload.copies,
        printer: payload.printer,
        hint: 'La impresion real se realiza en el navegador con window.print()',
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/sync-product', async (req, res, next) => {
    if (!woo?.updateProductSku) {
      return res.status(501).json({ error: 'Sincronizacion con WooCommerce no disponible' })
    }
    try {
      const payload = syncProductSchema.parse(req.body)
      const validated = validateBarcodeText(payload.type, payload.barcode)
      if (!validated.ok) {
        return res.status(400).json({ error: validated.error })
      }
      await woo.updateProductSku(payload.productId, validated.text)
      res.json({ ok: true, productId: payload.productId, sku: validated.text, barcode: validated.text })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res) => {
    const row = byId.get(req.params.id)
    if (!row) {
      return res.status(404).json({ error: 'Codigo no encontrado' })
    }
    const { image, ...meta } = row
    res.json({ ...meta, image })
  })

  return router
}

module.exports = createBarcodeRouter
