const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

function hasBuiltFrontend(dir) {
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

function ensureRootDist() {
  const rootDir = __dirname
  const rootDist = path.join(rootDir, 'dist')
  const frontendDist = path.join(rootDir, 'frontend', 'dist')

  if (hasBuiltFrontend(rootDist)) return

  // Fallback para deploy express sin build_script: compilar frontend en runtime.
  if (!hasBuiltFrontend(frontendDist)) {
    const run = spawnSync('npm', ['--prefix', 'frontend', 'run', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env,
    })
    if (run.status !== 0) {
      throw new Error('No se pudo compilar frontend para servir dist en runtime')
    }
  }

  fs.rmSync(rootDist, { recursive: true, force: true })
  fs.cpSync(frontendDist, rootDist, { recursive: true })
}

// Hostinger con root bloqueado: arrancar backend real desde /backend.
ensureRootDist()
process.chdir(path.join(__dirname, 'backend'))

const { start } = require(path.join(__dirname, 'backend/src/server'))
start()
