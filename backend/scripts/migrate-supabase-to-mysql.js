require('dotenv').config()

const { createClient } = require('@supabase/supabase-js')
const { query, ping } = require('../src/config/db')

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials for migration (SUPABASE_URL + key). Only needed once.',
    )
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

async function migrateOutflows(supabase) {
  const { data, error } = await supabase
    .from('salidas')
    .select('id, motivo, suma, tipo_pago, fecha')
  if (error) throw new Error(error.message)

  let migrated = 0
  for (const row of data || []) {
    const result = await query(
      `INSERT IGNORE INTO salidas (id, motivo, suma, tipo_pago, fecha)
       VALUES (?, ?, ?, ?, ?)`,
      [row.id, row.motivo, row.suma, row.tipo_pago, new Date(row.fecha)],
    )
    if (result.affectedRows > 0) migrated += 1
  }
  return migrated
}

async function migrateAnnotations(supabase) {
  const { data, error } = await supabase
    .from('anotaciones')
    .select(
      'id, titulo, cliente, recordar, fecha_recordar, marca, producto_id, producto_nombre, descripcion, fecha_creacion',
    )
  if (error) throw new Error(error.message)

  let migrated = 0
  for (const row of data || []) {
    const result = await query(
      `INSERT IGNORE INTO anotaciones (
         id, titulo, cliente, recordar, fecha_recordar, marca,
         producto_id, producto_nombre, descripcion, fecha_creacion
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.titulo,
        row.cliente || '',
        row.recordar ? 1 : 0,
        row.fecha_recordar || '',
        row.marca || '',
        row.producto_id,
        row.producto_nombre || '',
        row.descripcion || '',
        new Date(row.fecha_creacion),
      ],
    )
    if (result.affectedRows > 0) migrated += 1
  }
  return migrated
}

async function migrateComments(supabase) {
  const { data, error } = await supabase
    .from('anotacion_comentarios')
    .select('id, anotacion_id, texto, fecha')
  if (error) throw new Error(error.message)

  let migrated = 0
  for (const row of data || []) {
    const result = await query(
      `INSERT IGNORE INTO anotacion_comentarios (id, anotacion_id, texto, fecha)
       VALUES (?, ?, ?, ?)`,
      [row.id, row.anotacion_id, row.texto, new Date(row.fecha)],
    )
    if (result.affectedRows > 0) migrated += 1
  }
  return migrated
}

async function main() {
  await ping()
  const supabase = getSupabaseClient()

  const salidas = await migrateOutflows(supabase)
  const anotaciones = await migrateAnnotations(supabase)
  const comentarios = await migrateComments(supabase)

  // eslint-disable-next-line no-console
  console.log(
    `Migration complete: ${salidas} salidas, ${anotaciones} anotaciones, ${comentarios} comentarios inserted.`,
  )
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err)
  process.exit(1)
})
