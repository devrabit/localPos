const { isVariableProductType } = require('./wooProductType')

/** Cache del listado para escaneo (no se invalida en GET /productos; si en POST /orden). */
const CACHE_MS = Number(process.env.NARIPOS_SCAN_CACHE_MS || 120000)
const VARIATION_FETCH_CONCURRENCY = Math.max(1, Math.min(24, Number(process.env.NARIPOS_VARIATION_FETCH_CONCURRENCY || 8)))
let cachedList = null
let cachedAt = 0

function invalidateProductosScanCache() {
  cachedList = null
  cachedAt = 0
}

async function getCachedProductList(woo) {
  const now = Date.now()
  if (cachedList && now - cachedAt < CACHE_MS) {
    return cachedList
  }
  cachedList = await woo.fetchProducts()
  cachedAt = now
  return cachedList
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

/**
 * Solo SKU (el codigo de barras coincide con SKU en Woo).
 * Orden: productos simples → SKU variacion → SKU padre variable.
 */
async function findProductByScanCode(products, code, fetchVariationsRaw) {
  const q = normalizeScanCode(code)
  if (!q) return null

  const variationCache = new Map()
  const fetchVars = async (parentId) => {
    if (variationCache.has(parentId)) return variationCache.get(parentId)
    const raw = await fetchVariationsRaw(parentId)
    variationCache.set(parentId, raw)
    return raw
  }

  for (const p of products) {
    if (isVariableProductType(p.type)) continue
    const sku = skuFromEntity(p)
    if (sku && skuMatchesScan(sku, q)) {
      return { tipo: 'simple', producto: p, variacion: null }
    }
  }

  const variableParents = products.filter((p) => isVariableProductType(p.type))
  for (let i = 0; i < variableParents.length; i += VARIATION_FETCH_CONCURRENCY) {
    const batch = variableParents.slice(i, i + VARIATION_FETCH_CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        try {
          const vars = await fetchVars(p.id)
          return { p, vars: Array.isArray(vars) ? vars : [] }
        } catch {
          return { p, vars: [] }
        }
      }),
    )
    for (const { p, vars } of batchResults) {
      for (const v of vars) {
        const sku = skuFromEntity(v)
        if (sku && skuMatchesScan(sku, q)) {
          return { tipo: 'variacion', producto: p, variacion: v }
        }
      }
    }
  }

  for (const p of products) {
    if (!isVariableProductType(p.type)) continue
    const sku = skuFromEntity(p)
    if (sku && skuMatchesScan(sku, q)) {
      return { tipo: 'variable_sin_elegir', producto: p, variacion: null }
    }
  }

  return null
}

module.exports = {
  normalizeScanCode,
  skuFromEntity,
  skuMatchesScan,
  findProductByScanCode,
  getCachedProductList,
  invalidateProductosScanCache,
}
