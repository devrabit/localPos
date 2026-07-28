const crypto = require('crypto')
const { getPool, query } = require('../config/db')

const ESTADOS = [
  'en_proceso',
  'enviado_al_proveedor',
  'recibido',
  'subido_al_sitio',
]

function newId(prefix) {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

function mapItemRow(row) {
  return {
    id: row.id,
    nombreProducto: row.nombre_producto,
    referencia: row.referencia || '',
    cantidad: Number(row.cantidad) || 0,
    descripcion: row.descripcion || '',
  }
}

function mapPedidoRow(row, items = []) {
  const itemCount = items.length
    ? items.length
    : row.item_count != null
      ? Number(row.item_count)
      : 0
  const unidades = items.length
    ? items.reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0)
    : row.unidades != null
      ? Number(row.unidades)
      : 0

  return {
    id: row.id,
    dirigidoA: row.dirigido_a || '',
    estado: row.estado,
    fechaCreacion: new Date(row.fecha_creacion).toISOString(),
    itemCount,
    unidades,
    items,
  }
}

async function loadItems(pedidoId) {
  const rows = await query(
    `SELECT id, nombre_producto, referencia, cantidad, descripcion
     FROM pedido_items
     WHERE pedido_id = ?
     ORDER BY nombre_producto ASC`,
    [pedidoId],
  )
  return rows.map(mapItemRow)
}

async function listPedidos({ page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const offset = (safePage - 1) * safeLimit

  const countRows = await query('SELECT COUNT(*) AS total FROM pedidos')
  const total = Number(countRows[0]?.total || 0)

  // LIMIT/OFFSET como enteros validados (mysql2 prepared + LIMIT a veces falla)
  const rows = await query(
    `SELECT p.id, p.dirigido_a, p.estado, p.fecha_creacion,
            COUNT(i.id) AS item_count,
            COALESCE(SUM(i.cantidad), 0) AS unidades
     FROM pedidos p
     LEFT JOIN pedido_items i ON i.pedido_id = p.id
     GROUP BY p.id, p.dirigido_a, p.estado, p.fecha_creacion
     ORDER BY p.fecha_creacion DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
  )

  return {
    total,
    page: safePage,
    limit: safeLimit,
    pedidos: rows.map((row) => mapPedidoRow(row, [])),
  }
}

async function getPedido(id) {
  const rows = await query(
    `SELECT id, dirigido_a, estado, fecha_creacion
     FROM pedidos
     WHERE id = ?
     LIMIT 1`,
    [id],
  )
  if (!rows.length) return null
  const items = await loadItems(id)
  return mapPedidoRow(rows[0], items)
}

async function createPedido({ dirigidoA, items }) {
  const id = newId('ped')
  const fechaCreacion = new Date()
  const pool = getPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()
    await conn.execute(
      `INSERT INTO pedidos (id, dirigido_a, estado, fecha_creacion)
       VALUES (?, ?, 'en_proceso', ?)`,
      [id, dirigidoA, fechaCreacion],
    )

    const mappedItems = []
    for (const item of items) {
      const itemId = newId('pit')
      const nombreProducto = String(item.nombreProducto || '').trim()
      const referencia = String(item.referencia || '').trim()
      const cantidad = Number(item.cantidad)
      const descripcion = String(item.descripcion || '').trim()

      await conn.execute(
        `INSERT INTO pedido_items (
           id, pedido_id, nombre_producto, referencia, cantidad, descripcion
         ) VALUES (?, ?, ?, ?, ?, ?)`,
        [itemId, id, nombreProducto, referencia, cantidad, descripcion || null],
      )

      mappedItems.push({
        id: itemId,
        nombreProducto,
        referencia,
        cantidad,
        descripcion,
      })
    }

    await conn.commit()
    return {
      id,
      dirigidoA,
      estado: 'en_proceso',
      fechaCreacion: fechaCreacion.toISOString(),
      itemCount: mappedItems.length,
      unidades: mappedItems.reduce((sum, it) => sum + it.cantidad, 0),
      items: mappedItems,
    }
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}

async function updatePedidoEstado(id, estado) {
  if (!ESTADOS.includes(estado)) {
    const err = new Error('Estado invalido')
    err.status = 400
    throw err
  }
  const result = await query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id])
  if (!result.affectedRows) return null
  return getPedido(id)
}

module.exports = {
  ESTADOS,
  listPedidos,
  getPedido,
  createPedido,
  updatePedidoEstado,
}
