const dotenv = require('dotenv')

dotenv.config()

const env = {
  port: Number(process.env.PORT || 3001),
  wooUrl: process.env.WOO_URL || '',
  wooConsumerKey: process.env.WOO_CONSUMER_KEY || '',
  wooConsumerSecret: process.env.WOO_CONSUMER_SECRET || '',
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

module.exports = {
  env,
  assertEnv,
}
