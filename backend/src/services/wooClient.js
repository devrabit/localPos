const axios = require('axios')
const http = require('http')
const https = require('https')
const { env } = require('../config/env')

const LIST_TIMEOUT_MS = 30000
/** Consulta indexada en Woo (wc_product_meta_lookup): si tarda mas, no vale la pena esperar. */
const LOOKUP_TIMEOUT_MS = 10000

/** Reutilizar sockets: el escaneo dispara varias peticiones seguidas al mismo host. */
const agentOptions = { keepAlive: true, maxSockets: 32 }

const wooClient = axios.create({
  baseURL: `${env.wooUrl.replace(/\/$/, '')}/wp-json/wc/v3`,
  auth: {
    username: env.wooConsumerKey,
    password: env.wooConsumerSecret,
  },
  timeout: 15000,
  httpAgent: new http.Agent(agentOptions),
  httpsAgent: new https.Agent(agentOptions),
})

const PER_PAGE = 100

async function fetchAllPages(listPath, extraParams = {}, axiosOptions = {}) {
  const all = []
  let page = 1
  while (true) {
    const { data } = await wooClient.get(listPath, {
      params: { per_page: PER_PAGE, page, ...extraParams },
      ...axiosOptions,
    })
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    if (data.length < PER_PAGE) break
    page += 1
  }
  return all
}

function productsStatus() {
  return ['any', 'draft', 'pending', 'private', 'publish'].includes(env.wooProductsStatus)
    ? env.wooProductsStatus
    : 'any'
}

async function fetchProducts() {
  return fetchAllPages(
    '/products',
    {
      status: productsStatus(),
      orderby: 'id',
      order: 'asc',
    },
    { timeout: LIST_TIMEOUT_MS },
  )
}

/**
 * Con el parametro `sku`, Woo fuerza post_type = [product, product_variation] y resuelve
 * contra wc_product_meta_lookup: una sola peticion encuentra tambien variaciones.
 * `parent_id` > 0 identifica a la variacion y a su padre.
 */
async function fetchProductsBySku(sku) {
  const { data } = await wooClient.get('/products', {
    params: {
      sku: String(sku),
      status: productsStatus(),
      per_page: 10,
      _fields: 'id,type,parent_id,sku',
    },
    timeout: LOOKUP_TIMEOUT_MS,
  })
  return Array.isArray(data) ? data : []
}

async function fetchProductById(id) {
  const { data } = await wooClient.get(`/products/${id}`)
  return data
}

async function fetchProductVariations(productId) {
  return fetchAllPages(
    `/products/${productId}/variations`,
    {
      _fields: 'id,sku,price,regular_price,stock_quantity,manage_stock,attributes,meta_data',
    },
    { timeout: LIST_TIMEOUT_MS },
  )
}

async function fetchVariationById(productId, variationId) {
  const { data } = await wooClient.get(`/products/${productId}/variations/${variationId}`, {
    timeout: LOOKUP_TIMEOUT_MS,
  })
  return data
}

async function fetchCustomers() {
  return fetchAllPages('/customers')
}

async function createCustomer(payload) {
  const { data } = await wooClient.post('/customers', payload)
  return data
}

async function createOrder(payload) {
  const { data } = await wooClient.post('/orders', payload)
  return data
}

async function fetchOrdersPage(params) {
  const response = await wooClient.get('/orders', { params })
  const total = parseInt(response.headers['x-wp-total'] || '0', 10)
  const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10)
  return {
    orders: Array.isArray(response.data) ? response.data : [],
    total,
    totalPages,
  }
}

async function fetchOrderById(id) {
  const { data } = await wooClient.get(`/orders/${id}`)
  return data
}

async function updateProductSku(productId, sku) {
  const { data } = await wooClient.put(`/products/${productId}`, { sku: String(sku) })
  return data
}

async function updateVariationSku(productId, variationId, sku) {
  const { data } = await wooClient.put(`/products/${productId}/variations/${variationId}`, {
    sku: String(sku),
  })
  return data
}

module.exports = {
  fetchProducts,
  fetchProductsBySku,
  fetchProductById,
  fetchProductVariations,
  fetchVariationById,
  fetchCustomers,
  createCustomer,
  createOrder,
  fetchOrdersPage,
  fetchOrderById,
  updateProductSku,
  updateVariationSku,
}
