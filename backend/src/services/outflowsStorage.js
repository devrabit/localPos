const fs = require('fs/promises')
const path = require('path')
const crypto = require('crypto')

const storageDir = path.resolve(__dirname, '../../data')
const storageFile = path.join(storageDir, 'outflows.json')

async function ensureStorageFile() {
  await fs.mkdir(storageDir, { recursive: true })
  try {
    await fs.access(storageFile)
  } catch {
    await fs.writeFile(storageFile, '[]', 'utf8')
  }
}

async function readOutflows() {
  await ensureStorageFile()
  try {
    const raw = await fs.readFile(storageFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeOutflows(items) {
  await ensureStorageFile()
  await fs.writeFile(storageFile, JSON.stringify(items, null, 2), 'utf8')
}

function newOutflowId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `out_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

async function createOutflow({ motivo, suma, tipoPago }) {
  const outflows = await readOutflows()
  const record = {
    id: newOutflowId(),
    motivo,
    suma,
    tipoPago,
    fecha: new Date().toISOString(),
  }
  outflows.unshift(record)
  await writeOutflows(outflows)
  return record
}

async function listOutflows() {
  return readOutflows()
}

module.exports = {
  createOutflow,
  listOutflows,
}
