export const PAYMENT_METHODS = {
  EFECTIVO: 'EFECTIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: PAYMENT_METHODS.EFECTIVO, label: 'Pago en efectivo' },
  { value: PAYMENT_METHODS.TRANSFERENCIA, label: 'Transferencia virtual' },
]

export function paymentMethodLabel(value) {
  return PAYMENT_METHOD_OPTIONS.find((x) => x.value === value)?.label || value || ''
}
