const DATAFONO_COMMISSION_RATE = 0.04
const DATAFONO_FEE_NAME = 'Comision datafono (4%)'

const WOO_PAYMENT = {
  EFECTIVO: { payment_method: 'cod', payment_method_title: 'Pago en efectivo' },
  TRANSFERENCIA: { payment_method: 'bacs', payment_method_title: 'Transferencia virtual' },
  DATAFONO: { payment_method: 'datafono', payment_method_title: 'Pago con datafono' },
}

function roundMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function datafonoCommission(subtotal) {
  const base = Number(subtotal)
  if (!Number.isFinite(base) || base <= 0) return 0
  return roundMoney(base * DATAFONO_COMMISSION_RATE)
}

function wooPaymentFromMethod(method) {
  const mapped = WOO_PAYMENT[method]
  if (!mapped) {
    throw new Error('Metodo de pago no soportado')
  }
  return mapped
}

function feeCharges(feeLines) {
  if (!Array.isArray(feeLines)) return []
  return feeLines.flatMap((fee) => {
    const amount = Number(fee?.total ?? 0)
    if (!Number.isFinite(amount) || amount === 0) return []
    return [{ nombre: String(fee?.name || 'Comision'), amount }]
  })
}

module.exports = {
  DATAFONO_COMMISSION_RATE,
  DATAFONO_FEE_NAME,
  roundMoney,
  datafonoCommission,
  wooPaymentFromMethod,
  feeCharges,
}
