import { describe, it, expect } from 'vitest'
import { changeMinor, moneyToMinor, minorToMoney, parseCashReceivedInput } from './cashChange'

describe('cashChange', () => {
  it('moneyToMinor evita flotantes', () => {
    expect(moneyToMinor(10.5)).toBe(1050)
    expect(minorToMoney(1050)).toBe(10.5)
  })

  it('parseCashReceivedInput acepta coma decimal', () => {
    expect(parseCashReceivedInput('12,5')).toBe(12.5)
    expect(parseCashReceivedInput('')).toBe(null)
  })

  it('changeMinor calcula diferencia en centavos', () => {
    expect(changeMinor(1000, 2500)).toBe(1500)
  })
})
