const { isVariableProductType } = require('./wooProductType')

/** Cache del listado para escaneo (no se invalida en GET /productos; si en POST /orden y sync-product). */
const CACHE_MS = Number(process.env.NARIPOS_SCAN_CACHE_MS || 120000)
const VARIATIONS_CACHE_MS = Number(process.env.NARIPOS_VARIATIONS_CACHE_MS || 120000)
/** Etiqueta ilegible reescaneada: no repetir el barrido completo del catalogo. */
const NEGATIVE_CACHE_MS = Number(process.env.NARIPOS_SCAN_NEGATIVE_MS || 15000)
const NEGATIVE_CACHE_MAX = 500
const VARIATION_FETCH_CONCURRENCY = Math.max(1, Math.min(24, Number(process.env.NARIPOS_VARIATION_FETCH_CONCURRENCY || 8)))

let cachedList = null
let cachedAt = 0
let listRefresh = null
/** Un refresco iniciado antes de invalidar no debe repoblar la cache con datos viejos. */
let generacion = 0
let listRefreshGeneracion = -1
const variationsCache = new Map()
const negativeCache = new Map()

function createScanMetrics() {
  return {
    origen: 'desconocido',
    peticionesWoo: 0,
    msTotal: 0,
    msListado: 0,
    msLookup: 0,
    msVariaciones: 0,
  }
}

function invalidateProductosScanCache() {
  cachedList = null
  cachedAt = 0
  generacion += 1
  listRefresh = null
  listRefreshGeneracion = -1
  variationsCache.clear()
  negativeCache.clear()
}

function refreshProductList(woo) {
  if (listRefresh && listRefreshGeneracion === generacion) {
    return listRefresh
  }
  const gen = generacion
  listRefreshGeneracion = gen
  listRefresh = Promise.resolve()
    .then(() => woo.fetchProducts())
    .then((list) => {
      if (gen === generacion) {
        cachedList = list
        cachedAt = Date.now()
      }
      return list
    })
    .finally(() => {
      if (listRefreshGeneracion === gen) {
        listRefresh = null
        listRefreshGeneracion = -1
      }
    })
  return listRefresh
}

/**
 * Stale-while-revalidate: con la cache vencida se devuelve la copia vieja y se refresca
 * en segundo plano, para que ningun escaneo espere al listado completo de Woo.
 */
async function getCachedProductList(woo) {
  const now = Date.now()
  if (cachedList && now - cachedAt < CACHE_MS) {
    return cachedList
  }
  if (cachedList) {
    refreshProductList(woo).catch(() => {
      /* Se sigue sirviendo la copia vieja; el proximo escaneo reintenta. */
    })
    return cachedList
  }
  return refreshProductList(woo)
}

/** Precarga al arrancar el servidor: el primer escaneo del dia ya encuentra la cache caliente. */
function warmProductosScanCache(woo) {
  return refreshProductList(woo).catch(() => null)
}

function negativeCacheHas(qNorm) {
  const key = qNorm.toLowerCase()
  const at = negativeCache.get(key)
  if (at == null) return false
  if (Date.now() - at < NEGATIVE_CACHE_MS) return true
  negativeCache.delete(key)
  return false
}

function negativeCacheAdd(qNorm) {
  if (negativeCache.size >= NEGATIVE_CACHE_MAX) negativeCache.clear()
  negativeCache.set(qNorm.toLowerCase(), Date.now())
}

function normalizeScanCode(raw) {
  if (raw == null) return ''
  let s = String(raw).trim().slice(0, 80)
  if (!s) return ''
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
  if (/<|>|javascript:/i.test(s)) return ''
  if (!/^[\dA-Za-z\-._/]+$/.test(s)) return ''
  return s
}

function skuFromEntity(entity) {
  let s = (entity?.sku || '').trim()
  if (s) return s
  for (const m of entity?.meta_data || []) {
    if (m && m.key === '_sku' && m.value != null && String(m.value).trim()) {
      return String(m.value).trim()
    }
  }
  return ''
}

function skuMatchesScan(sku, qNorm) {
  const s = normalizeScanCode(sku)
  if (!s || !qNorm) return false
  return s.toLowerCase() === qNorm.toLowerCase()
}

function findInList(products, id) {
  const target = Number(id)
  return (products || []).find((p) => Number(p?.id) === target) || null
}

async function resolveProduct(products, id, deps, metricas) {
  const enCache = findInList(products, id)
  if (enCache) return enCache
  if (typeof deps.fetchProductById !== 'function') return null
  metricas.peticionesWoo += 1
  return deps.fetchProductById(id)
}

/**
 * Camino rapido: Woo resuelve el SKU (producto o variacion) en una sola consulta indexada.
 * Devuelve null ante cualquier fallo o respuesta vacia para que el barrido siga cubriendo
 * los casos que el indice de Woo no ve (p. ej. SKU guardado solo en meta_data._sku).
 */
async function lookupBySku(products, qNorm, deps, metricas) {
  if (typeof deps.fetchProductsBySku !== 'function') return null

  const inicio = Date.now()
  try {
    metricas.peticionesWoo += 1
    const rows = await deps.fetchProductsBySku(qNorm)
    const match = (Array.isArray(rows) ? rows : []).find((r) => skuMatchesScan(r?.sku, qNorm))
    if (!match) return null

    const parentId = Number(match.parent_id || 0)
    const esVariacion = parentId > 0 || match.type === 'variation'

    if (!esVariacion) {
      const producto = await resolveProduct(products, match.id, deps, metricas)
      if (!producto) return null
      return isVariableProductType(producto.type)
        ? { tipo: 'variable_sin_elegir', producto, variacion: null }
        : { tipo: 'simple', producto, variacion: null }
    }

    if (typeof deps.fetchVariationById !== 'function') return null
    metricas.peticionesWoo += 1
    const [producto, variacion] = await Promise.all([
      resolveProduct(products, parentId, deps, metricas),
      deps.fetchVariationById(parentId, match.id),
    ])
    if (!producto || !variacion) return null
    return { tipo: 'variacion', producto, variacion }
  } catch {
    return null
  } finally {
    metricas.msLookup += Date.now() - inicio
  }
}

async function buscarVariacionPorBarrido(variableParents, qNorm, fetchVariationsRaw, metricas) {
  const inicio = Date.now()
  const fetchVars = async (parentId) => {
    const entry = variationsCache.get(parentId)
    if (entry && Date.now() - entry.at < VARIATIONS_CACHE_MS) return entry.data
    metricas.peticionesWoo += 1
    const raw = await fetchVariationsRaw(parentId)
    const data = Array.isArray(raw) ? raw : []
    variationsCache.set(parentId, { data, at: Date.now() })
    return data
  }

  try {
    for (let i = 0; i < variableParents.length; i += VARIATION_FETCH_CONCURRENCY) {
      const batch = variableParents.slice(i, i + VARIATION_FETCH_CONCURRENCY)
      const batchResults = await Promise.all(
        batch.map(async (p) => {
          try {
            return { p, vars: await fetchVars(p.id) }
          } catch {
            return { p, vars: [] }
          }
        }),
      )
      for (const { p, vars } of batchResults) {
        for (const v of vars) {
          const sku = skuFromEntity(v)
          if (sku && skuMatchesScan(sku, qNorm)) {
            return { tipo: 'variacion', producto: p, variacion: v }
          }
        }
      }
    }
    return null
  } finally {
    metricas.msVariaciones += Date.now() - inicio
  }
}

/**
 * Solo SKU (el codigo de barras coincide con SKU en Woo).
 * Orden: catalogo en memoria → lookup nativo por SKU → barrido de variaciones → SKU padre variable.
 */
async function findProductByScanCode(products, code, fetchVariationsRaw, deps = {}) {
  const q = normalizeScanCode(code)
  if (!q) return null

  const metricas = deps.metricas || createScanMetrics()

  if (negativeCacheHas(q)) {
    metricas.origen = 'cache-negativa'
    return null
  }

  for (const p of products) {
    if (isVariableProductType(p.type)) continue
    const sku = skuFromEntity(p)
    if (sku && skuMatchesScan(sku, q)) {
      metricas.origen = 'catalogo'
      return { tipo: 'simple', producto: p, variacion: null }
    }
  }

  const porLookup = await lookupBySku(products, q, deps, metricas)
  if (porLookup) {
    metricas.origen = 'lookup'
    return porLookup
  }

  const variableParents = products.filter((p) => isVariableProductType(p.type))
  const porBarrido = await buscarVariacionPorBarrido(variableParents, q, fetchVariationsRaw, metricas)
  if (porBarrido) {
    metricas.origen = 'barrido'
    return porBarrido
  }

  for (const p of variableParents) {
    const sku = skuFromEntity(p)
    if (sku && skuMatchesScan(sku, q)) {
      metricas.origen = 'catalogo'
      return { tipo: 'variable_sin_elegir', producto: p, variacion: null }
    }
  }

  metricas.origen = 'no-encontrado'
  negativeCacheAdd(q)
  return null
}

module.exports = {
  normalizeScanCode,
  skuFromEntity,
  skuMatchesScan,
  findProductByScanCode,
  createScanMetrics,
  getCachedProductList,
  warmProductosScanCache,
  invalidateProductosScanCache,
}
