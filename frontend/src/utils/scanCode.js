/** Misma regla que backend `normalizeScanCode` (productScan.js). */
export function normalizeScanCode(raw) {
  if (raw == null) return ''
  let s = String(raw).trim().slice(0, 80)
  if (!s) return ''
  s = s.replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
  if (/<|>|javascript:/i.test(s)) return ''
  if (!/^[\dA-Za-z\-._/]+$/.test(s)) return ''
  return s
}

export function esCodigoEscaneable(raw) {
  return normalizeScanCode(raw) !== ''
}
