const axios = require('axios')
const { env } = require('../config/env')

const LIST_TIMEOUT_MS = 120000

const wooClient = axios.create({
  baseURL: `${env.wooUrl.replace(/\/$/, '')}/wp-json/wc/v3`,
  auth: {
    username: env.wooConsumerKey,
    password: env.wooConsumerSecret,
  },
  timeout: 15000,
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

async function fetchProducts() {
  const status =
    ['any', 'draft', 'pending', 'private', 'publish'].includes(env.wooProductsStatus)
      ? env.wooProductsStatus
      : 'any'
  return fetchAllPages(
    '/products',
    {
      status,
      orderby: 'id',
      order: 'asc',
    },
    { timeout: LIST_TIMEOUT_MS },
  )
}

async function fetchProductById(id) {
  const { data } = await wooClient.get(`/products/${id}`)
  return data
}

async function fetchProductVariations(productId) {
  return fetchAllPages(`/products/${productId}/variations`)
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

module.exports = {
  fetchProducts,
  fetchProductById,
  fetchProductVariations,
  fetchCustomers,
  createCustomer,
  createOrder,
  fetchOrdersPage,
  fetchOrderById,
  updateProductSku,
}
