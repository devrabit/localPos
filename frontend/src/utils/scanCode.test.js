import { describe, expect, it } from 'vitest'
import { crearBufferEscaneo, limpiarCodigoLector } from './scanCode'

describe('limpiarCodigoLector', () => {
  it('quita el prefijo AIM que agregan algunos lectores', () => {
    expect(limpiarCodigoLector(']C15901234123457')).toBe('5901234123457')
    expect(limpiarCodigoLector(']E012345678')).toBe('12345678')
  })

  it('quita caracteres de control', () => {
    expect(limpiarCodigoLector('\u0002590123\r')).toBe('590123')
  })
})

describe('crearBufferEscaneo', () => {
  it('un teclazo suelto no se pega al codigo siguiente', () => {
    const buffer = crearBufferEscaneo({ gapMs: 100 })
    buffer.pushChar('x', 0)
    for (const [i, ch] of [...'590123'].entries()) {
      buffer.pushChar(ch, 1000 + i * 10)
    }
    expect(buffer.pushEnter(1000 + 60, false)).toBe('590123')
  })

  it('fuera de un campo, Enter entrega el buffer aunque sea corto', () => {
    const buffer = crearBufferEscaneo()
    buffer.pushChar('A', 0)
    buffer.pushChar('B', 20)
    expect(buffer.pushEnter(40, false)).toBe('AB')
  })

  it('dentro de un campo solo acepta una rafaga de lector', () => {
    const buffer = crearBufferEscaneo({ minLengthEnCampo: 4, promedioMaxEnCampo: 45 })
    let t = 0
    for (const ch of '750123456789') {
      buffer.pushChar(ch, t)
      t += 12
    }
    expect(buffer.pushEnter(t, true)).toBe('750123456789')
  })

  it('dentro de un campo ignora tipeo humano', () => {
    const buffer = crearBufferEscaneo({ gapMs: 100, minLengthEnCampo: 4, promedioMaxEnCampo: 45 })
    let t = 0
    for (const ch of 'hola') {
      buffer.pushChar(ch, t)
      t += 180
    }
    expect(buffer.pushEnter(t, true)).toBe('')
  })

  it('la tercera tecla rapida dentro de un campo se puede robar', () => {
    const buffer = crearBufferEscaneo({ promedioMaxEnCampo: 45 })
    expect(buffer.pushChar('7', 0).robarTecla).toBe(false)
    expect(buffer.pushChar('5', 10).robarTecla).toBe(false)
    expect(buffer.pushChar('0', 20).robarTecla).toBe(true)
  })
})
