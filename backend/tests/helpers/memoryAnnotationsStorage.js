const crypto = require('crypto')

function createMemoryAnnotationsStorage() {
  const items = []

  function newId(prefix) {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  }

  async function listAnnotations() {
    return [...items].sort((a, b) => {
      const ta = new Date(a.fechaCreacion || 0).getTime()
      const tb = new Date(b.fechaCreacion || 0).getTime()
      return tb - ta
    })
  }

  async function getAnnotation(id) {
    return items.find((x) => x.id === id) || null
  }

  async function createAnnotation(payload) {
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
    return record
  }

  async function deleteAnnotation(id) {
    const idx = items.findIndex((x) => x.id === id)
    if (idx === -1) return false
    items.splice(idx, 1)
    return true
  }

  async function addComment(annotationId, texto) {
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
    return items[idx]
  }

  return {
    listAnnotations,
    getAnnotation,
    createAnnotation,
    deleteAnnotation,
    addComment,
  }
}

function stubAnnotationsStorageInCache() {
  const storagePath = require.resolve('../../src/services/annotationsStorage')
  delete require.cache[storagePath]
  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: createMemoryAnnotationsStorage(),
  }
  delete require.cache[require.resolve('../../src/routes/api')]
}

function clearAnnotationsStorageStub() {
  delete require.cache[require.resolve('../../src/services/annotationsStorage')]
  delete require.cache[require.resolve('../../src/routes/api')]
}

module.exports = {
  createMemoryAnnotationsStorage,
  stubAnnotationsStorageInCache,
  clearAnnotationsStorageStub,
}
