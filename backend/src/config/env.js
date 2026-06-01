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
  supabaseUrl:
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '',
  supabaseKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '',
}

function assertEnv() {
  const missing = []
  if (!env.wooUrl) missing.push('WOO_URL')
  if (!env.wooConsumerKey) missing.push('WOO_CONSUMER_KEY')
  if (!env.wooConsumerSecret) missing.push('WOO_CONSUMER_SECRET')
  if (!env.supabaseUrl) missing.push('SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL)')
  if (!env.supabaseKey) {
    missing.push(
      'SUPABASE_SERVICE_ROLE_KEY (recomendado) o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    )
  }
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

module.exports = {
  env,
  assertEnv,
}
