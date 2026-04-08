function ean13Checksum12(str12) {
  let sum = 0
  for (let i = 0; i < 12; i += 1) {
    const d = parseInt(str12[i], 10)
    if (Number.isNaN(d)) return null
    sum += i % 2 === 0 ? d : d * 3
  }
  return (10 - (sum % 10)) % 10
}

function normalizeEan13Input(input) {
  const digits = String(input).replace(/\D/g, '')
  if (digits.length === 12) {
    const check = ean13Checksum12(digits)
    if (check == null) return null
    return `${digits}${check}`
  }
  if (digits.length === 13) return digits
  return null
}

function validateEan13(raw) {
  const normalized = normalizeEan13Input(raw)
  if (!normalized) {
    return { ok: false, error: 'EAN13 requiere 12 o 13 digitos' }
  }
  const check = parseInt(normalized[12], 10)
  const expected = ean13Checksum12(normalized.slice(0, 12))
  if (expected == null || check !== expected) {
    return { ok: false, error: 'Digito de control EAN13 invalido' }
  }
  return { ok: true, text: normalized }
}

function validateCode128(raw) {
  const s = String(raw).trim()
  if (!s.length) {
    return { ok: false, error: 'Texto vacio' }
  }
  if (s.length > 80) {
    return { ok: false, error: 'Maximo 80 caracteres para CODE128' }
  }
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    if (c < 32 || c > 126) {
      return { ok: false, error: 'Solo caracteres ASCII imprimibles (32-126)' }
    }
  }
  return { ok: true, text: s }
}

function validateBarcodeText(type, raw) {
  if (type === 'EAN13') {
    return validateEan13(raw)
  }
  return validateCode128(raw)
}

module.exports = {
  validateBarcodeText,
  validateCode128,
  validateEan13,
}
