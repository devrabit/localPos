const crypto = require('crypto')
const { getSupabase, throwOnError } = require('../config/supabase')

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
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('anotacion_comentarios')
    .select('id, texto, fecha')
    .eq('anotacion_id', annotationId)
    .order('fecha', { ascending: true })
  throwOnError(error, 'loadCommentsForAnnotation')
  return (data || []).map(mapCommentRow)
}

async function listAnnotations() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('anotaciones')
    .select(
      'id, titulo, cliente, recordar, fecha_recordar, marca, producto_id, producto_nombre, descripcion, fecha_creacion',
    )
    .order('fecha_creacion', { ascending: false })
  throwOnError(error, 'listAnnotations')
  return (data || []).map(mapAnnotationRow)
}

async function getAnnotation(id) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('anotaciones')
    .select(
      'id, titulo, cliente, recordar, fecha_recordar, marca, producto_id, producto_nombre, descripcion, fecha_creacion',
    )
    .eq('id', id)
    .maybeSingle()
  throwOnError(error, 'getAnnotation')
  if (!data) return null
  const record = mapAnnotationRow(data)
  record.comentarios = await loadCommentsForAnnotation(id)
  return record
}

async function createAnnotation(payload) {
  const id = newId('ant')
  const fechaCreacion = new Date().toISOString()
  const row = {
    id,
    titulo: payload.titulo,
    cliente: payload.cliente || '',
    recordar: Boolean(payload.recordar),
    fecha_recordar: payload.recordar && payload.fechaRecordar ? payload.fechaRecordar : '',
    marca: payload.marca || '',
    producto_id:
      payload.productoId != null && Number.isFinite(Number(payload.productoId))
        ? Number(payload.productoId)
        : null,
    producto_nombre: payload.productoNombre || '',
    descripcion: payload.descripcion || '',
    fecha_creacion: fechaCreacion,
  }
  const supabase = getSupabase()
  const { error } = await supabase.from('anotaciones').insert(row)
  throwOnError(error, 'createAnnotation')
  return {
    id,
    titulo: row.titulo,
    cliente: row.cliente,
    recordar: row.recordar,
    fechaRecordar: row.fecha_recordar,
    marca: row.marca,
    productoId: row.producto_id,
    productoNombre: row.producto_nombre,
    descripcion: row.descripcion,
    fechaCreacion,
    comentarios: [],
  }
}

async function deleteAnnotation(id) {
  const supabase = getSupabase()
  const { data, error } = await supabase.from('anotaciones').delete().eq('id', id).select('id')
  throwOnError(error, 'deleteAnnotation')
  return (data?.length ?? 0) > 0
}

async function addComment(annotationId, texto) {
  const supabase = getSupabase()
  const { data: existing, error: findError } = await supabase
    .from('anotaciones')
    .select('id')
    .eq('id', annotationId)
    .maybeSingle()
  throwOnError(findError, 'addComment.find')
  if (!existing) return null

  const commentId = newId('cmt')
  const fecha = new Date().toISOString()
  const { error } = await supabase.from('anotacion_comentarios').insert({
    id: commentId,
    anotacion_id: annotationId,
    texto: texto.trim(),
    fecha,
  })
  throwOnError(error, 'addComment.insert')
  return getAnnotation(annotationId)
}

module.exports = {
  listAnnotations,
  getAnnotation,
  createAnnotation,
  deleteAnnotation,
  addComment,
}
