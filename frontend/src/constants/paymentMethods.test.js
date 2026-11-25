import { describe, it, expect } from 'vitest'
import { datafonoCommission, totalWithPayment } from './paymentMethods'

describe('comision datafono', () => {
  it('suma el 4% redondeado a centavos', () => {
    expect(datafonoCommission(10000)).toBe(400)
    expect(datafonoCommission(10.55)).toBe(0.42)
    expect(datafonoCommission(19.99)).toBe(0.8)
    expect(totalWithPayment(10000, 'DATAFONO')).toBe(10400)
    expect(totalWithPayment(10000, 'EFECTIVO')).toBe(10000)
    expect(totalWithPayment(10.55, 'DATAFONO')).toBe(10.97)
  })
})
