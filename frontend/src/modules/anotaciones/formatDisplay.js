export function formatFecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}
