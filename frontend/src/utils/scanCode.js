/** Quita prefijos que algunos lectores agregan (AIM ]C1, ]E0) y caracteres de control. */
export function limpiarCodigoLector(raw) {
  let s = String(raw ?? '')
  s = s.replace(/[\u0000-\u001F\u007F]/g, '')
  s = s.replace(/^\][A-Za-z][0-9]/, '')
  return s.trim()
}

/**
 * Buffer del lector USB.
 * - Si pasa mas de `gapMs` entre teclas, descarta lo anterior: un teclazo suelto
 *   no se pega al codigo y deja de coincidir con el SKU.
 * - Fuera de un campo, Enter entrega el buffer (igual que antes).
 * - Dentro de un input, solo cuenta como lectura si las teclas llegaron en rafaga
 *   (un lector es mucho mas rapido que una persona).
 */
export function crearBufferEscaneo({
  gapMs = 100,
  minLengthEnCampo = 4,
  promedioMaxEnCampo = 45,
} = {}) {
  let buffer = ''
  let lastAt = 0
  let burstStart = 0

  function reset() {
    buffer = ''
    lastAt = 0
    burstStart = 0
  }

  function promedio(now) {
    if (buffer.length < 2) return Infinity
    return (now - burstStart) / (buffer.length - 1)
  }

  function pushChar(ch, now) {
    if (buffer && now - lastAt > gapMs) buffer = ''
    if (!buffer) burstStart = now
    buffer = (buffer + ch).slice(-80)
    lastAt = now
    return { robarTecla: buffer.length >= 3 && promedio(now) <= promedioMaxEnCampo }
  }

  function pushEnter(now, enCampo) {
    const code = buffer
    const veloz = code.length >= minLengthEnCampo && promedio(now) <= promedioMaxEnCampo
    reset()
    if (!code) return ''
    if (!enCampo) return code
    return veloz ? code : ''
  }

  return { pushChar, pushEnter, reset }
}

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
