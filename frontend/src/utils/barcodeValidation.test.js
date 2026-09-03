import { describe, it, expect } from 'vitest'
import { validarCode128, validarCodigoBarras, validarEan13 } from './barcodeValidation'

describe('barcodeValidation', () => {
  it('validarCode128 acepta texto valido', () => {
    expect(validarCode128('SC-001')).toEqual({ ok: true, text: 'SC-001' })
  })

  it('validarCode128 rechaza vacio y caracteres no ASCII', () => {
    expect(validarCode128('')).toEqual({ ok: false, error: 'Texto vacio' })
    expect(validarCode128('a\u0001')).toEqual({
      ok: false,
      error: 'Solo caracteres ASCII imprimibles (32-126)',
    })
  })

  it('validarCode128 rechaza mas de 80 caracteres', () => {
    const res = validarCode128('x'.repeat(81))
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Maximo 80 caracteres para CODE128')
  })

  it('validarEan13 completa checksum con 12 digitos', () => {
    const res = validarEan13('400638133393')
    expect(res.ok).toBe(true)
    expect(res.text).toBe('4006381333931')
  })

  it('validarEan13 acepta 13 digitos validos', () => {
    const res = validarEan13('4006381333931')
    expect(res).toEqual({ ok: true, text: '4006381333931' })
  })

  it('validarEan13 rechaza largo invalido y checksum incorrecto', () => {
    expect(validarEan13('123').ok).toBe(false)
    expect(validarEan13('4006381333930').error).toBe('Digito de control EAN13 invalido')
  })

  it('validarCodigoBarras despacha por tipo', () => {
    expect(validarCodigoBarras('CODE128', 'ABC').ok).toBe(true)
    expect(validarCodigoBarras('EAN13', '4006381333931').ok).toBe(true)
  })
})
