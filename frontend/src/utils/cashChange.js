/** Enteros en centavos para evitar errores de punto flotante (spec cambio dinero). */
export function moneyToMinor(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

export function minorToMoney(minor) {
  const m = Number(minor)
  if (!Number.isFinite(m)) return 0
  return Math.round(m) / 100
}

export function parseCashReceivedInput(raw) {
  if (raw == null) return null
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function changeMinor(totalMinor, receivedMinor) {
  if (!Number.isFinite(totalMinor) || !Number.isFinite(receivedMinor)) return null
  return receivedMinor - totalMinor
}

export function formatMoneyEs(n) {
  return Number(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
