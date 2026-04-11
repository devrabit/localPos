import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCarritoStore, lineKeyFor } from './carrito'

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import api from '../services/api'

describe('useCarritoStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api.post).mockReset()
  })

  it('lineKeyFor distingue simple y variacion', () => {
    expect(lineKeyFor(1, null)).toBe('p-1')
    expect(lineKeyFor(1, 99)).toBe('v-99')
  })

  it('calcula total y suma cantidades del mismo producto simple', () => {
    const store = useCarritoStore()
    store.agregarProducto({ id: 1, nombre: 'A', precio: 10, tipo: 'simple', stock: -1 })
    store.agregarProducto({ id: 1, nombre: 'A', precio: 10, tipo: 'simple', stock: -1 })
    expect(store.total).toBe(20)
    expect(store.items[0].cantidad).toBe(2)
  })

  it('no agrega al carrito producto variable desde agregarProducto', () => {
    const store = useCarritoStore()
    store.agregarProducto({ id: 1, nombre: 'V', precio: 10, tipo: 'variable' })
    expect(store.items.length).toBe(0)
  })

  it('decrementar elimina linea cuando cantidad llega a 0', () => {
    const store = useCarritoStore()
    store.agregarProducto({ id: 2, nombre: 'B', precio: 5, tipo: 'simple', stock: -1 })
    store.decrementar(lineKeyFor(2, null))
    expect(store.items.length).toBe(0)
  })

  it('agregarVariacion crea linea con variationId', () => {
    const store = useCarritoStore()
    store.agregarVariacion({
      productId: 1,
      variationId: 101,
      nombre: 'Camiseta - Roja',
      precio: 25,
      stock: -1,
    })
    expect(store.items[0].lineKey).toBe('v-101')
    expect(store.items[0].productId).toBe(1)
  })

  it('crearOrden envia cliente con id y variationId', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { orderId: 7 } })
    const store = useCarritoStore()
    store.agregarVariacion({
      productId: 1,
      variationId: 55,
      nombre: 'X',
      precio: 10,
      stock: -1,
    })
    await store.crearOrden({ id: 99, nombre: 'Maria', telefono: '555' })
    expect(api.post).toHaveBeenCalledWith(
      '/orden',
      expect.objectContaining({
        cliente: { id: 99, nombre: 'Maria', telefono: '555' },
        items: [{ productId: 1, variationId: 55, cantidad: 1 }],
      }),
    )
  })

  it('agregarLinea suma cantidad en una sola linea', () => {
    const store = useCarritoStore()
    store.agregarLinea({ id: 5, nombre: 'P', precio: 2, maxStock: -1 }, 4)
    expect(store.items[0].cantidad).toBe(4)
    store.agregarLinea({ id: 5, nombre: 'P', precio: 2, maxStock: -1 }, 2)
    expect(store.items[0].cantidad).toBe(6)
  })

  it('crearOrden sin cliente no envia campo cliente', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { orderId: 1 } })
    const store = useCarritoStore()
    store.agregarProducto({ id: 2, nombre: 'Y', precio: 5, tipo: 'simple', stock: -1 })
    await store.crearOrden(null)
    expect(api.post).toHaveBeenCalledWith('/orden', {
      items: [{ productId: 2, cantidad: 1 }],
    })
  })

  it('crearOrden guarda lastFactura y vacia carrito', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { orderId: 42 } })
    const store = useCarritoStore()
    store.agregarProducto({ id: 1, nombre: 'A', precio: 10, tipo: 'simple', stock: -1 })
    await store.crearOrden({ nombre: 'Juan', telefono: '300' })
    expect(store.lastFactura).toBeTruthy()
    expect(store.lastFactura.id).toBe('42')
    expect(store.lastFactura.items).toHaveLength(1)
    expect(store.lastFactura.cliente.nombre).toBe('Juan')
    expect(store.items).toHaveLength(0)
  })
})
