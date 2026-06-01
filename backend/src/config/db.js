const mysql = require('mysql2/promise')
const { env } = require('./env')

let pool = null

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.dbHost,
      port: env.dbPort,
      user: env.dbUser,
      password: env.dbPassword,
      database: env.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

async function ping() {
  await query('SELECT 1 AS ok')
  return true
}

async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = {
  getPool,
  query,
  ping,
  closePool,
}
