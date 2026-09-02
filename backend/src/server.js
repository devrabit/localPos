const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const createApiRouter = require('./routes/api')
const { postPrintHandler } = require('./routes/print')
const wooClient = require('./services/wooClient')
const { formatWooError } = require('./utils/wooErrors')
const { assertEnv, env } = require('./config/env')
const { ensureSchema } = require('./db/ensureSchema')
const { warmProductosScanCache } = require('./utils/productScan')

const app = express()

app.use(
  cors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/health', async (_req, res) => {
  try {
    const { ping } = require('./config/db')
    await ping()
    res.json({ ok: true, db: true })
  } catch {
    res.status(503).json({ ok: false, db: false })
  }
})

app.post('/print', postPrintHandler)

app.use('/api', createApiRouter(wooClient))

/**
 * Deploy unico (Hostinger/root bloqueado): servir frontend compilado.
 * Busca dist dentro de backend y tambien en ../dist (build desde root).
 */
const distCandidates = [
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), '../dist'),
]
const frontendDist = distCandidates.find((p) => fs.existsSync(path.join(p, 'index.html')))

if (frontendDist) {
  app.use(express.static(frontendDist))
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/print') {
      return next()
    }
    return res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

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
  ensureSchema()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('MySQL schema OK (CREATE IF NOT EXISTS).')
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('MySQL schema ensure failed:', err?.message || err)
    })
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running at http://localhost:${env.port}`)
    warmProductosScanCache(wooClient)
  })
}

if (require.main === module) {
  start()
}

module.exports = { app, start }
