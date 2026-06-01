const { createClient } = require('@supabase/supabase-js')
const { env } = require('./env')

let client = null

function getSupabase() {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

function throwOnError(error, context) {
  if (error) {
    throw new Error(error.message || `Supabase error${context ? ` (${context})` : ''}`)
  }
}

async function ping() {
  const supabase = getSupabase()
  const { error } = await supabase.from('salidas').select('id').limit(1)
  throwOnError(error, 'ping')
  return true
}

module.exports = {
  getSupabase,
  throwOnError,
  ping,
}
