const dotenv = require('dotenv')

dotenv.config()

const env = {
  port: Number(process.env.PORT || 3001),
  wooUrl: process.env.WOO_URL || '',
  wooConsumerKey: process.env.WOO_CONSUMER_KEY || '',
  wooConsumerSecret: process.env.WOO_CONSUMER_SECRET || '',
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim(),
  /** Woo REST: any | draft | pending | private | publish (por defecto any = todos los visibles para la API) */
  wooProductsStatus: (process.env.WOO_PRODUCTS_STATUS || 'any').trim(),
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || '',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || '',
}

function assertEnv() {
  const missing = []
  if (!env.wooUrl) missing.push('WOO_URL')
  if (!env.wooConsumerKey) missing.push('WOO_CONSUMER_KEY')
  if (!env.wooConsumerSecret) missing.push('WOO_CONSUMER_SECRET')
  if (!env.dbUser) missing.push('DB_USER')
  if (!env.dbPassword) missing.push('DB_PASSWORD')
  if (!env.dbName) missing.push('DB_NAME')
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

module.exports = {
  env,
  assertEnv,
}
