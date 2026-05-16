const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

const storageDir = path.resolve(__dirname, '../../data')

function getStorageFile() {
  if (process.env.NARIPOS_ANNOTATIONS_FILE) {
    return path.resolve(process.env.NARIPOS_ANNOTATIONS_FILE)
  }
  return path.join(storageDir, 'Anotaciones.json')
}

async function ensureStorageFile() {
  const storageFile = getStorageFile()
  const dir = path.dirname(storageFile)
  await fs.mkdir(dir, { recursive: true })
  try {
    await fs.access(storageFile)
  } catch {
    await fs.writeFile(storageFile, '[]', 'utf8')
  }
}

async function readAnnotations() {
  await ensureStorageFile()
  const storageFile = getStorageFile()
  try {
    const raw = await fs.readFile(storageFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeAnnotations(items) {
  await ensureStorageFile()
  const storageFile = getStorageFile()
  await fs.writeFile(storageFile, JSON.stringify(items, null, 2), 'utf8')
}

function newId(prefix) {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

async function listAnnotations() {
  const items = await readAnnotations()
  return [...items].sort((a, b) => {
    const ta = new Date(a.fechaCreacion || 0).getTime()
    const tb = new Date(b.fechaCreacion || 0).getTime()
    return tb - ta
  })
}

async function getAnnotation(id) {
  const items = await readAnnotations()
  return items.find((x) => x.id === id) || null
}

async function createAnnotation(payload) {
  const items = await readAnnotations()
  const record = {
    id: newId('ant'),
    titulo: payload.titulo,
    cliente: payload.cliente || '',
    recordar: Boolean(payload.recordar),
    fechaRecordar: payload.recordar && payload.fechaRecordar ? payload.fechaRecordar : '',
    marca: payload.marca || '',
    productoId:
      payload.productoId != null && Number.isFinite(Number(payload.productoId))
        ? Number(payload.productoId)
        : null,
    productoNombre: payload.productoNombre || '',
    descripcion: payload.descripcion || '',
    fechaCreacion: new Date().toISOString(),
    comentarios: [],
  }
  items.unshift(record)
  await writeAnnotations(items)
  return record
}

async function deleteAnnotation(id) {
  const items = await readAnnotations()
  const next = items.filter((x) => x.id !== id)
  if (next.length === items.length) return false
  await writeAnnotations(next)
  return true
}

async function addComment(annotationId, texto) {
  const items = await readAnnotations()
  const idx = items.findIndex((x) => x.id === annotationId)
  if (idx === -1) return null
  const comment = {
    id: newId('cmt'),
    texto: texto.trim(),
    fecha: new Date().toISOString(),
  }
  const row = items[idx]
  const comentarios = Array.isArray(row.comentarios) ? [...row.comentarios, comment] : [comment]
  items[idx] = { ...row, comentarios }
  await writeAnnotations(items)
  return items[idx]
}

module.exports = {
  listAnnotations,
  getAnnotation,
  createAnnotation,
  deleteAnnotation,
  addComment,
}
