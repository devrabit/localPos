require('dotenv').config()

const { ensureSchema } = require('../src/db/ensureSchema')

ensureSchema()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('MySQL connection OK. Schema applied.')
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err.message || err)
    process.exit(1)
  })
