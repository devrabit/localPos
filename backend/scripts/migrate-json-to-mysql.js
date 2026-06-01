const fs = require('fs/promises')
const path = require('path')
require('dotenv').config()

const { query, closePool } = require('../src/config/db')

const dataDir = path.resolve(__dirname, '../data')
const outflowsFile = path.join(dataDir, 'outflows.json')

function getAnnotationsFile() {
  if (process.env.NARIPOS_ANNOTATIONS_FILE) {
    return path.resolve(process.env.NARIPOS_ANNOTATIONS_FILE)
  }
  return path.join(dataDir, 'Anotaciones.json')
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function migrateOutflows() {
  const items = await readJsonArray(outflowsFile)
  let inserted = 0
  for (const item of items) {
    if (!item?.id || !item?.motivo || item?.suma == null || !item?.tipoPago) continue
    const result = await query(
      `INSERT IGNORE INTO salidas (id, motivo, suma, tipo_pago, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      [item.id, item.motivo, item.suma, item.tipoPago, new Date(item.fecha || Date.now())],
    )
    if (result.affectedRows > 0) inserted += 1
  }
  return { total: items.length, inserted }
}

async function migrateAnnotations() {
  const items = await readJsonArray(getAnnotationsFile())
  let insertedAnnotations = 0
  let insertedComments = 0

  for (const item of items) {
    if (!item?.id || !item?.titulo) continue
    const annResult = await query(
      `INSERT IGNORE INTO anotaciones
        (id, titulo, cliente, recordar, fecha_recordar, marca, producto_id, producto_nombre, descripcion, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.titulo,
        item.cliente || '',
        item.recordar ? 1 : 0,
        item.fechaRecordar || '',
        item.marca || '',
        item.productoId != null ? Number(item.productoId) : null,
        item.productoNombre || '',
        item.descripcion || '',
        new Date(item.fechaCreacion || Date.now()),
      ],
    )
    if (annResult.affectedRows > 0) insertedAnnotations += 1

    const comentarios = Array.isArray(item.comentarios) ? item.comentarios : []
    for (const c of comentarios) {
      if (!c?.id || !c?.texto) continue
      const cmtResult = await query(
        `INSERT IGNORE INTO anotacion_comentarios (id, anotacion_id, texto, fecha)
         VALUES (?, ?, ?, ?)`,
        [c.id, item.id, c.texto, new Date(c.fecha || Date.now())],
      )
      if (cmtResult.affectedRows > 0) insertedComments += 1
    }
  }

  return { total: items.length, insertedAnnotations, insertedComments }
}

async function main() {
  const outflows = await migrateOutflows()
  const annotations = await migrateAnnotations()
  await closePool()

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        salidas: outflows,
        anotaciones: annotations,
      },
      null,
      2,
    ),
  )
}

main().catch(async (err) => {
  await closePool().catch(() => {})
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
