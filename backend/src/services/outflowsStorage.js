const crypto = require('crypto')
const { query } = require('../config/db')

function newOutflowId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `out_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

function mapOutflowRow(row) {
  return {
    id: row.id,
    motivo: row.motivo,
    suma: Number(row.suma),
    tipoPago: row.tipo_pago,
    fecha: new Date(row.fecha).toISOString(),
  }
}

async function createOutflow({ motivo, suma, tipoPago }) {
  const id = newOutflowId()
  const fecha = new Date()
  await query(
    `INSERT INTO salidas (id, motivo, suma, tipo_pago, fecha)
     VALUES (?, ?, ?, ?, ?)`,
    [id, motivo, suma, tipoPago, fecha],
  )
  return {
    id,
    motivo,
    suma,
    tipoPago,
    fecha: fecha.toISOString(),
  }
}

async function listOutflows() {
  const rows = await query(
    `SELECT id, motivo, suma, tipo_pago, fecha
     FROM salidas
     ORDER BY fecha DESC`,
  )
  return rows.map(mapOutflowRow)
}

module.exports = {
  createOutflow,
  listOutflows,
}
