const mysql = require('mysql2/promise')
const { env } = require('./env')

let pool

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
      timezone: 'Z',
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
}

module.exports = {
  getPool,
  query,
  ping,
}
