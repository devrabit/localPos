const crypto = require('crypto')

const ESTADOS = [
  'en_proceso',
  'enviado_al_proveedor',
  'recibido',
  'subido_al_sitio',
]

function createMemoryPedidosStorage() {
  const pedidos = []

  function newId(prefix) {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
  }

  function mapPedido(row) {
    const items = Array.isArray(row.items) ? row.items : []
    return {
      id: row.id,
      dirigidoA: row.dirigidoA,
      estado: row.estado,
      fechaCreacion: row.fechaCreacion,
      itemCount: items.length,
      unidades: items.reduce((sum, it) => sum + (Number(it.cantidad) || 0), 0),
      items: items.map((it) => ({ ...it })),
    }
  }

  async function listPedidos({ page = 1, limit = 20 } = {}) {
    const safePage = Math.max(1, Number(page) || 1)
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
    const sorted = [...pedidos].sort(
      (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
    )
    const start = (safePage - 1) * safeLimit
    const slice = sorted.slice(start, start + safeLimit).map((row) => {
      const full = mapPedido(row)
      return {
        id: full.id,
        dirigidoA: full.dirigidoA,
        estado: full.estado,
        fechaCreacion: full.fechaCreacion,
        itemCount: full.itemCount,
        unidades: full.unidades,
        items: [],
      }
    })
    return { total: pedidos.length, page: safePage, limit: safeLimit, pedidos: slice }
  }

  async function getPedido(id) {
    const row = pedidos.find((p) => p.id === id)
    return row ? mapPedido(row) : null
  }

  async function createPedido({ dirigidoA, items }) {
    const id = newId('ped')
    const fechaCreacion = new Date().toISOString()
    const mappedItems = (items || []).map((item) => ({
      id: newId('pit'),
      nombreProducto: String(item.nombreProducto || '').trim(),
      referencia: String(item.referencia || '').trim(),
      cantidad: Number(item.cantidad),
      descripcion: String(item.descripcion || '').trim(),
    }))
    const row = {
      id,
      dirigidoA,
      estado: 'en_proceso',
      fechaCreacion,
      items: mappedItems,
    }
    pedidos.unshift(row)
    return mapPedido(row)
  }

  async function updatePedido(id, { dirigidoA, items }) {
    const idx = pedidos.findIndex((p) => p.id === id)
    if (idx === -1) return null
    const prev = pedidos[idx]
    const mappedItems = (items || []).map((item) => ({
      id: newId('pit'),
      nombreProducto: String(item.nombreProducto || '').trim(),
      referencia: String(item.referencia || '').trim(),
      cantidad: Number(item.cantidad),
      descripcion: String(item.descripcion || '').trim(),
    }))
    pedidos[idx] = {
      ...prev,
      dirigidoA,
      items: mappedItems,
    }
    return mapPedido(pedidos[idx])
  }

  async function updatePedidoEstado(id, estado) {
    if (!ESTADOS.includes(estado)) {
      const err = new Error('Estado invalido')
      err.status = 400
      throw err
    }
    const idx = pedidos.findIndex((p) => p.id === id)
    if (idx === -1) return null
    pedidos[idx] = { ...pedidos[idx], estado }
    return mapPedido(pedidos[idx])
  }

  return {
    ESTADOS,
    listPedidos,
    getPedido,
    createPedido,
    updatePedido,
    updatePedidoEstado,
  }
}

function stubPedidosStorageInCache() {
  const storagePath = require.resolve('../../src/services/pedidosStorage')
  delete require.cache[storagePath]
  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: createMemoryPedidosStorage(),
  }
  delete require.cache[require.resolve('../../src/routes/api')]
}

function clearPedidosStorageStub() {
  delete require.cache[require.resolve('../../src/services/pedidosStorage')]
  delete require.cache[require.resolve('../../src/routes/api')]
}

module.exports = {
  createMemoryPedidosStorage,
  stubPedidosStorageInCache,
  clearPedidosStorageStub,
}
