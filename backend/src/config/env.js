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
}

function assertEnv() {
  const missing = []
  if (!env.wooUrl) missing.push('WOO_URL')
  if (!env.wooConsumerKey) missing.push('WOO_CONSUMER_KEY')
  if (!env.wooConsumerSecret) missing.push('WOO_CONSUMER_SECRET')
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

/**
 * Lee el gateway en cada llamada. Los tests cambian process.env despues de importar
 * el modulo, y el objeto `env` queda congelado al arrancar.
 */
function readGatewayEnv() {
  const rawUrl = (process.env.GATEWAY_URL || 'https://nariaigateway.nariuniverse.com').trim()
  return {
    url: rawUrl.replace(/\/+$/, ''),
    apiKey: (process.env.GATEWAY_API_KEY || '').trim(),
  }
}

module.exports = {
  env,
  assertEnv,
  readGatewayEnv,
}
