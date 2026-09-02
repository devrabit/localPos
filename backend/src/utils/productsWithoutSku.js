const { isVariableProductType } = require('./wooProductType')
const { skuFromEntity, getCachedProductList, createCachedVariationFetcher } = require('./productScan')

const SIN_SKU_CACHE_MS = Number(process.env.NARIPOS_SIN_SKU_CACHE_MS || 120000)
const VARIATION_FETCH_CONCURRENCY = Math.max(
  1,
  Math.min(24, Number(process.env.NARIPOS_VARIATION_FETCH_CONCURRENCY || 8)),
)

let cachedResponse = null
let cachedAt = 0
let refreshPromise = null

function stockFromWooEntity(entity) {
  if (!entity || typeof entity !== 'object') return 0
  const unlimited =
    entity.manage_stock === false &&
    (entity.stock_quantity === null || entity.stock_quantity === undefined)
  return unlimited ? -1 : Number(entity.stock_quantity ?? 0)
}

function variationLabel(v) {
  const parts = (v.attributes || [])
    .map((a) => a.option)
    .filter(Boolean)
  return parts.length ? parts.join(' / ') : `#${v.id}`
}

function mapSimpleRow(p) {
  return {
    productId: p.id,
    variationId: null,
    nombre: p.name,
    tipo: 'simple',
    precio: Number(p.price || 0),
    stock: stockFromWooEntity(p),
  }
}

function mapVariationRow(p, v) {
  const label = variationLabel(v)
  return {
    productId: p.id,
    variationId: v.id,
    nombre: `${p.name} — ${label}`,
    tipo: 'variacion',
    precio: Number(v.price || v.regular_price || 0),
    stock: stockFromWooEntity(v),
  }
}

function mapVariableParentRow(p) {
  return {
    productId: p.id,
    variationId: null,
    nombre: p.name,
    tipo: 'variable',
    precio: Number(p.price || 0),
    stock: stockFromWooEntity(p),
  }
}

/**
 * Productos y variaciones sin SKU (campo sku o meta _sku vacios).
 */
async function findProductsWithoutSku(products, fetchVariationsRaw) {
  const variableParents = products.filter((p) => isVariableProductType(p.type))
  const simpleProducts = products.filter((p) => !isVariableProductType(p.type))
  const items = []

  for (const p of simpleProducts) {
    if (!skuFromEntity(p)) items.push(mapSimpleRow(p))
  }

  for (let i = 0; i < variableParents.length; i += VARIATION_FETCH_CONCURRENCY) {
    const batch = variableParents.slice(i, i + VARIATION_FETCH_CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (p) => {
        let vars = []
        try {
          vars = await fetchVariationsRaw(p.id)
        } catch {
          vars = []
        }
        return { p, vars: Array.isArray(vars) ? vars : [] }
      }),
    )

    for (const { p, vars } of batchResults) {
      if (vars.length === 0) {
        if (!skuFromEntity(p)) items.push(mapVariableParentRow(p))
        continue
      }
      for (const v of vars) {
        if (!skuFromEntity(v)) items.push(mapVariationRow(p, v))
      }
      if (!skuFromEntity(p)) items.push(mapVariableParentRow(p))
    }
  }

  items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return items
}

async function buildProductsWithoutSkuResponse(woo) {
  const products = await getCachedProductList(woo)
  const fetchVars = createCachedVariationFetcher((id) => woo.fetchProductVariations(id))
  const items = await findProductsWithoutSku(products, fetchVars)
  return { items, total: items.length }
}

function invalidateSinSkuCache() {
  cachedResponse = null
  cachedAt = 0
  refreshPromise = null
}

/**
 * Stale-while-revalidate: evita 504 en Hostinger al no repetir el barrido completo de Woo.
 */
async function getProductsWithoutSkuResponse(woo) {
  const now = Date.now()
  if (cachedResponse && now - cachedAt < SIN_SKU_CACHE_MS) {
    return cachedResponse
  }
  if (cachedResponse) {
    if (!refreshPromise) {
      refreshPromise = buildProductsWithoutSkuResponse(woo)
        .then((result) => {
          cachedResponse = result
          cachedAt = Date.now()
          return result
        })
        .finally(() => {
          refreshPromise = null
        })
    }
    refreshPromise.catch(() => {})
    return cachedResponse
  }
  const result = await buildProductsWithoutSkuResponse(woo)
  cachedResponse = result
  cachedAt = Date.now()
  return result
}

function warmSinSkuCache(woo) {
  return getProductsWithoutSkuResponse(woo).catch(() => null)
}

module.exports = {
  findProductsWithoutSku,
  mapSimpleRow,
  mapVariationRow,
  mapVariableParentRow,
  getProductsWithoutSkuResponse,
  invalidateSinSkuCache,
  warmSinSkuCache,
}
