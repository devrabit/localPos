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
const { warmSinSkuCache } = require('./utils/productsWithoutSku')

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
 * Requiere index.html y carpeta assets (Vite); si no, Express serviria HTML
 * roto y /assets/*.js devolveria 404 o fallback incorrecto (error MIME).
 * Preferimos ../dist (build desde raiz / server.js) antes que dist junto al backend.
 */
function dirHasUsableFrontendBuild(dir) {
  try {
    const indexPath = path.join(dir, 'index.html')
    const assetsDir = path.join(dir, 'assets')
    if (!fs.existsSync(indexPath) || !fs.existsSync(assetsDir) || !fs.statSync(assetsDir).isDirectory()) {
      return false
    }

    const html = fs.readFileSync(indexPath, 'utf8')
    const assetRefs = new Set()
    const refRegex = /(?:src|href)="\/assets\/([^"]+)"/g
    let match = refRegex.exec(html)
    while (match) {
      assetRefs.add(match[1])
      match = refRegex.exec(html)
    }

    if (assetRefs.size === 0) {
      return fs.readdirSync(assetsDir).length > 0
    }

    for (const relFile of assetRefs) {
      if (!fs.existsSync(path.join(assetsDir, relFile))) return false
    }
    return true
  } catch {
    return false
  }
}

const distCandidates = [
  path.resolve(process.cwd(), '../dist'),
  path.resolve(process.cwd(), 'dist'),
]
let frontendDist = distCandidates.find((p) => dirHasUsableFrontendBuild(p))

if (!frontendDist) {
  for (const p of distCandidates) {
    if (fs.existsSync(path.join(p, 'index.html')) && !dirHasUsableFrontendBuild(p)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[naripos] Ignorando dist incompleto en ${p} (falta assets/). Arranca desde la raiz del repo con "npm start" o ejecuta "npm run build" en la raiz.`,
      )
    }
  }
}

if (frontendDist) {
  // eslint-disable-next-line no-console
  console.log(`[naripos] Static frontend: ${frontendDist}`)
  app.use(express.static(frontendDist))
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/print') {
      return next()
    }
    // Solo fallback SPA para navegacion HTML, nunca para assets (/assets/*.js, *.css, etc).
    const wantsHtml = String(req.headers.accept || '').includes('text/html')
    const hasExtension = path.extname(req.path) !== ''
    if (!wantsHtml || hasExtension) return next()
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
    warmProductosScanCache(wooClient).then(() => warmSinSkuCache(wooClient))
  })
}

if (require.main === module) {
  start()
}

module.exports = { app, start }
