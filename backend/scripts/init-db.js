require('dotenv').config()

const { ping } = require('../src/config/supabase')

async function main() {
  await ping()
  // eslint-disable-next-line no-console
  console.log(
    'Supabase connection OK. If tables are missing, run backend/db/schema.sql in Supabase SQL Editor.',
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
