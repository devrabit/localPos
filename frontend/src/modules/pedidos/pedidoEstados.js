export const PEDIDO_ESTADOS = [
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'enviado_al_proveedor', label: 'Enviado al proveedor' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'subido_al_sitio', label: 'Subido al sitio' },
]

export function etiquetaEstado(value) {
  const found = PEDIDO_ESTADOS.find((e) => e.value === value)
  return found ? found.label : value || '—'
}

export function formatFechaPedido(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}
