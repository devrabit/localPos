export const DATAFONO_COMMISSION_RATE = 0.04
export const DATAFONO_FEE_NAME = 'Comision datafono (4%)'

export const PAYMENT_METHODS = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  DATAFONO: 'DATAFONO',
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHODS.EFECTIVO, label: 'Pago en efectivo' },
  { value: PAYMENT_METHODS.TRANSFERENCIA, label: 'Transferencia virtual' },
  { value: PAYMENT_METHODS.DATAFONO, label: 'Pago con datafono' },
]

export function paymentMethodLabel(value) {
  return PAYMENT_METHOD_OPTIONS.find((x) => x.value === value)?.label || value || ''
}

export function roundMoney(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Comision del 4% sobre el subtotal de la compra. Cero si el subtotal no es positivo. */
export function datafonoCommission(subtotal) {
  const base = Number(subtotal)
  if (!Number.isFinite(base) || base <= 0) return 0
  return roundMoney(base * DATAFONO_COMMISSION_RATE)
}

export function totalWithPayment(subtotal, paymentMethod) {
  const base = Number(subtotal)
  if (!Number.isFinite(base)) return 0
  if (paymentMethod !== PAYMENT_METHODS.DATAFONO) return roundMoney(base)
  return roundMoney(base + datafonoCommission(base))
}
