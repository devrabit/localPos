/**
 * Woo usa `variable` y extensiones (`variable-subscription`, etc.).
 * Solo `variable` exacto dejaba fuera variaciones en escaneo y en GET /variaciones.
 */
function isVariableProductType(type) {
  const t = String(type || '')
  return t === 'variable' || t.startsWith('variable-')
}

module.exports = { isVariableProductType }
