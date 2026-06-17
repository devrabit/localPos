const fs = require('fs/promises')
const path = require('path')
require('dotenv').config()

const { getPool, ping } = require('../src/config/db')

async function runSchema() {
  const schemaPath = path.resolve(__dirname, '../db/schema.sql')
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
}

async function main() {
  await runSchema()
  await ping()
  // eslint-disable-next-line no-console
  console.log('MySQL connection OK. Schema applied.')
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
