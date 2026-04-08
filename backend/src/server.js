const express = require('express')
const cors = require('cors')
const createApiRouter = require('./routes/api')
const wooClient = require('./services/wooClient')
const { formatWooError } = require('./utils/wooErrors')
const { assertEnv, env } = require('./config/env')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', createApiRouter(wooClient))

app.use((error, _req, res, _next) => {
  if (error?.name === 'ZodError') {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: error.issues,
    })
  }

  const statusCode = error?.response?.status && error.response.status < 500 ? error.response.status : 500
  const message = formatWooError(error)

  res.status(statusCode).json({
    error: message,
  })
})

function start() {
  assertEnv()
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running at http://localhost:${env.port}`)
  })
}

if (require.main === module) {
  start()
}

module.exports = { app, start }
