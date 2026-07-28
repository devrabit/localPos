const fs = require('fs/promises')
const path = require('path')
const { getPool, ping } = require('../config/db')

/**
 * Aplica schema.sql (CREATE TABLE IF NOT EXISTS).
 * Seguro llamar en cada arranque: no borra datos.
 */
async function ensureSchema() {
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql')
  const raw = await fs.readFile(schemaPath, 'utf8')
  const withoutComments = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
  const statements = withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  const pool = getPool()
  for (const statement of statements) {
    await pool.query(statement)
  }
  await ping()
}

module.exports = { ensureSchema }
