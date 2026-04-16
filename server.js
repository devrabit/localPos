const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

function hasBuiltFrontend(dir) {
  return fs.existsSync(path.join(dir, 'index.html')) && fs.existsSync(path.join(dir, 'assets'))
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
