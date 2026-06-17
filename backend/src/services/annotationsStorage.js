const crypto = require('crypto')
const { query } = require('../config/db')

function newId(prefix) {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

function mapAnnotationRow(row) {
  return {
    id: row.id,
    titulo: row.titulo,
    cliente: row.cliente || '',
    recordar: Boolean(row.recordar),
    fechaRecordar: row.fecha_recordar || '',
    marca: row.marca || '',
    productoId: row.producto_id != null ? Number(row.producto_id) : null,
    productoNombre: row.producto_nombre || '',
    descripcion: row.descripcion || '',
    fechaCreacion: new Date(row.fecha_creacion).toISOString(),
    comentarios: [],
  }
}

function mapCommentRow(row) {
  return {
    id: row.id,
    texto: row.texto,
    fecha: new Date(row.fecha).toISOString(),
  }
}

async function loadCommentsForAnnotation(annotationId) {
  const rows = await query(
    `SELECT id, texto, fecha
     FROM anotacion_comentarios
     WHERE anotacion_id = ?
     ORDER BY fecha ASC`,
    [annotationId],
  )
  return rows.map(mapCommentRow)
}

async function listAnnotations() {
  const rows = await query(
    `SELECT id, titulo, cliente, recordar, fecha_recordar, marca,
            producto_id, producto_nombre, descripcion, fecha_creacion
     FROM anotaciones
     ORDER BY fecha_creacion DESC`,
  )
  return rows.map(mapAnnotationRow)
}

async function getAnnotation(id) {
  const rows = await query(
    `SELECT id, titulo, cliente, recordar, fecha_recordar, marca,
            producto_id, producto_nombre, descripcion, fecha_creacion
     FROM anotaciones
     WHERE id = ?
     LIMIT 1`,
    [id],
  )
  if (!rows.length) return null
  const record = mapAnnotationRow(rows[0])
  record.comentarios = await loadCommentsForAnnotation(id)
  return record
}

async function createAnnotation(payload) {
  const id = newId('ant')
  const fechaCreacion = new Date()
  const productoId =
    payload.productoId != null && Number.isFinite(Number(payload.productoId))
      ? Number(payload.productoId)
      : null

  await query(
    `INSERT INTO anotaciones (
       id, titulo, cliente, recordar, fecha_recordar, marca,
       producto_id, producto_nombre, descripcion, fecha_creacion
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      payload.titulo,
      payload.cliente || '',
      payload.recordar ? 1 : 0,
      payload.recordar && payload.fechaRecordar ? payload.fechaRecordar : '',
      payload.marca || '',
      productoId,
      payload.productoNombre || '',
      payload.descripcion || '',
      fechaCreacion,
    ],
  )

  return {
    id,
    titulo: payload.titulo,
    cliente: payload.cliente || '',
    recordar: Boolean(payload.recordar),
    fechaRecordar: payload.recordar && payload.fechaRecordar ? payload.fechaRecordar : '',
    marca: payload.marca || '',
    productoId,
    productoNombre: payload.productoNombre || '',
    descripcion: payload.descripcion || '',
    fechaCreacion: fechaCreacion.toISOString(),
    comentarios: [],
  }
}

async function deleteAnnotation(id) {
  const result = await query('DELETE FROM anotaciones WHERE id = ?', [id])
  return result.affectedRows > 0
}

async function addComment(annotationId, texto) {
  const existing = await query('SELECT id FROM anotaciones WHERE id = ? LIMIT 1', [
    annotationId,
  ])
  if (!existing.length) return null

  const commentId = newId('cmt')
  const fecha = new Date()
  await query(
    `INSERT INTO anotacion_comentarios (id, anotacion_id, texto, fecha)
     VALUES (?, ?, ?, ?)`,
    [commentId, annotationId, texto.trim(), fecha],
  )
  return getAnnotation(annotationId)
}

module.exports = {
  listAnnotations,
  getAnnotation,
  createAnnotation,
  deleteAnnotation,
  addComment,
}
