const fs = require('fs/promises')
const path = require('path')
require('dotenv').config()

const { getSupabase, throwOnError } = require('../src/config/supabase')

const dataDir = path.resolve(__dirname, '../data')
const outflowsFile = path.join(dataDir, 'outflows.json')

function getAnnotationsFile() {
  if (process.env.NARIPOS_ANNOTATIONS_FILE) {
    return path.resolve(process.env.NARIPOS_ANNOTATIONS_FILE)
  }
  return path.join(dataDir, 'Anotaciones.json')
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function migrateOutflows() {
  const items = await readJsonArray(outflowsFile)
  let upserted = 0
  const supabase = getSupabase()

  for (const item of items) {
    if (!item?.id || !item?.motivo || item?.suma == null || !item?.tipoPago) continue
    const { error } = await supabase.from('salidas').upsert(
      {
        id: item.id,
        motivo: item.motivo,
        suma: item.suma,
        tipo_pago: item.tipoPago,
        fecha: new Date(item.fecha || Date.now()).toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (!error) upserted += 1
  }

  return { total: items.length, upserted }
}

async function migrateAnnotations() {
  const items = await readJsonArray(getAnnotationsFile())
  let upsertedAnnotations = 0
  let upsertedComments = 0
  const supabase = getSupabase()

  for (const item of items) {
    if (!item?.id || !item?.titulo) continue
    const { error: annError } = await supabase.from('anotaciones').upsert(
      {
        id: item.id,
        titulo: item.titulo,
        cliente: item.cliente || '',
        recordar: Boolean(item.recordar),
        fecha_recordar: item.fechaRecordar || '',
        marca: item.marca || '',
        producto_id: item.productoId != null ? Number(item.productoId) : null,
        producto_nombre: item.productoNombre || '',
        descripcion: item.descripcion || '',
        fecha_creacion: new Date(item.fechaCreacion || Date.now()).toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    throwOnError(annError, 'migrateAnnotations')
    if (!annError) upsertedAnnotations += 1

    const comentarios = Array.isArray(item.comentarios) ? item.comentarios : []
    for (const c of comentarios) {
      if (!c?.id || !c?.texto) continue
      const { error: cmtError } = await supabase.from('anotacion_comentarios').upsert(
        {
          id: c.id,
          anotacion_id: item.id,
          texto: c.texto,
          fecha: new Date(c.fecha || Date.now()).toISOString(),
        },
        { onConflict: 'id', ignoreDuplicates: true },
      )
      throwOnError(cmtError, 'migrateComments')
      if (!cmtError) upsertedComments += 1
    }
  }

  return { total: items.length, upsertedAnnotations, upsertedComments }
}

async function main() {
  const outflows = await migrateOutflows()
  const annotations = await migrateAnnotations()

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        salidas: outflows,
        anotaciones: annotations,
      },
      null,
      2,
    ),
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
