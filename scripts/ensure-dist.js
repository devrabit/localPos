#!/usr/bin/env node
/**
 * Hostinger corre `npm run build` en cada deploy.
 * El frontend ya va versionado en /dist; si Vite falla (memoria / Node viejo),
 * el deploy no debe tumbar un bundle bueno ya presente en el repo.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const distIndex = path.join(root, 'dist', 'index.html')

function hasPrebuiltDist() {
  return fs.existsSync(distIndex)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  return result.status === 0
}

function rebuildFromFrontend() {
  console.log('[ensure-dist] Compilando frontend con Vite...')
  if (!run('npm', ['--prefix', 'frontend', 'run', 'build'])) {
    return false
  }
  const frontendDist = path.join(root, 'frontend', 'dist')
  if (!fs.existsSync(path.join(frontendDist, 'index.html'))) {
    console.error('[ensure-dist] frontend/dist/index.html no existe tras el build')
    return false
  }
  fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true })
  fs.cpSync(frontendDist, path.join(root, 'dist'), { recursive: true })
  console.log('[ensure-dist] dist/ actualizado desde frontend/dist')
  return true
}

if (process.env.NARIPOS_FORCE_BUILD === '1') {
  if (!rebuildFromFrontend()) process.exit(1)
  process.exit(0)
}

if (hasPrebuiltDist()) {
  console.log('[ensure-dist] Usando dist/ precompilado del repositorio (Hostinger-safe).')
  console.log('[ensure-dist] Para forzar Vite: NARIPOS_FORCE_BUILD=1 npm run build')
  process.exit(0)
}

console.log('[ensure-dist] No hay dist/index.html; intentando build completo...')
if (!rebuildFromFrontend()) {
  console.error('[ensure-dist] Build fallido y no hay dist precompilado.')
  process.exit(1)
}
