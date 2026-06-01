const crypto = require('crypto')
const { getSupabase, throwOnError } = require('../config/supabase')

function newOutflowId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `out_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`
}

function mapOutflowRow(row) {
  return {
    id: row.id,
    motivo: row.motivo,
    suma: Number(row.suma),
    tipoPago: row.tipo_pago,
    fecha: new Date(row.fecha).toISOString(),
  }
}

async function createOutflow({ motivo, suma, tipoPago }) {
  const id = newOutflowId()
  const fecha = new Date().toISOString()
  const supabase = getSupabase()
  const { error } = await supabase.from('salidas').insert({
    id,
    motivo,
    suma,
    tipo_pago: tipoPago,
    fecha,
  })
  throwOnError(error, 'createOutflow')
  return {
    id,
    motivo,
    suma,
    tipoPago,
    fecha,
  }
}

async function listOutflows() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('salidas')
    .select('id, motivo, suma, tipo_pago, fecha')
    .order('fecha', { ascending: false })
  throwOnError(error, 'listOutflows')
  return (data || []).map(mapOutflowRow)
}

module.exports = {
  createOutflow,
  listOutflows,
}
