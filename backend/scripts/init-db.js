const fs = require('fs/promises')
const path = require('path')
const mysql = require('mysql2/promise')
require('dotenv').config()

async function main() {
  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME
  const port = Number(process.env.DB_PORT || 3306)

  if (!host || !user || !password || !database) {
    throw new Error('Missing DB_HOST, DB_USER, DB_PASSWORD or DB_NAME')
  }

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true })
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``)
  await conn.changeUser({ database })

  const schemaPath = path.resolve(__dirname, '../db/schema.sql')
  const sql = await fs.readFile(schemaPath, 'utf8')
  await conn.query(sql)
  await conn.end()

  // eslint-disable-next-line no-console
  console.log(`Schema applied to database "${database}"`)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
