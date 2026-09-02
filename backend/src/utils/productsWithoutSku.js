const { isVariableProductType } = require('./wooProductType')
const { skuFromEntity, getCachedProductList, createCachedVariationFetcher } = require('./productScan')

const SIN_SKU_CACHE_MS = Number(process.env.NARIPOS_SIN_SKU_CACHE_MS || 120000)
const VARIATION_FETCH_CONCURRENCY = Math.max(
  1,
  Math.min(24, Number(process.env.NARIPOS_VARIATION_FETCH_CONCURRENCY || 8)),
)

const PAGE_CACHE_MAX = 60
/** Respuestas por pagina: clave `page|limit|q`. */
const pageCache = new Map()

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

function matchesQuery(product, qLower) {
  if (!qLower) return true
  const nombre = String(product?.name || '').toLowerCase()
  if (nombre.includes(qLower)) return true
  const sku = skuFromEntity(product).toLowerCase()
  if (sku && sku.includes(qLower)) return true
  return String(product?.id ?? '').includes(qLower)
}

async function buildPage(woo, page, limit, q) {
  const products = await getCachedProductList(woo)
  const qLower = q.trim().toLowerCase()
  const candidatos = qLower ? products.filter((p) => matchesQuery(p, qLower)) : products.slice()

  /** Orden estable: sin esto la paginacion baila entre peticiones. */
  candidatos.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'es'))

  const totalProductos = candidatos.length
  const totalPages = Math.max(1, Math.ceil(totalProductos / limit))
  const paginaSegura = Math.min(page, totalPages)
  const inicio = (paginaSegura - 1) * limit
  const slice = candidatos.slice(inicio, inicio + limit)

  const fetchVars = createCachedVariationFetcher((id) => woo.fetchProductVariations(id))
  const items = await findProductsWithoutSku(slice, fetchVars)

  return {
    items,
    total: items.length,
    page: paginaSegura,
    limit,
    totalProductos,
    totalPages,
    hasMore: paginaSegura < totalPages,
  }
}

function invalidateSinSkuCache() {
  pageCache.clear()
}

/**
 * Solo pide variaciones de los productos de la pagina pedida: sin esto el barrido
 * completo del catalogo agota el timeout del hosting (504).
 */
async function getProductsWithoutSkuPage(woo, { page = 1, limit = 20, q = '' } = {}) {
  const key = `${page}|${limit}|${q.trim().toLowerCase()}`
  const cached = pageCache.get(key)
  if (cached && Date.now() - cached.at < SIN_SKU_CACHE_MS) {
    return cached.data
  }

  const data = await buildPage(woo, page, limit, q)
  if (pageCache.size >= PAGE_CACHE_MAX) pageCache.clear()
  pageCache.set(key, { data, at: Date.now() })
  return data
}

/** Precarga solo la primera pagina: el resto se resuelve al navegar. */
function warmSinSkuCache(woo) {
  return getProductsWithoutSkuPage(woo).catch(() => null)
}

module.exports = {
  findProductsWithoutSku,
  mapSimpleRow,
  mapVariationRow,
  mapVariableParentRow,
  getProductsWithoutSkuPage,
  invalidateSinSkuCache,
  warmSinSkuCache,
}
