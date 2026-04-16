import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'
import { PAYMENT_METHODS, paymentMethodLabel } from '../constants/paymentMethods'

export function lineKeyFor(productId, variationId) {
  return variationId != null && variationId !== '' ? `v-${variationId}` : `p-${productId}`
}

export const useCarritoStore = defineStore('carrito', () => {
  const items = ref([])
  const creatingOrder = ref(false)
  const orderError = ref('')
  const orderSuccess = ref('')
  /** Ultima venta confirmada para imprimir factura (spec ImpresionDeFactura) */
  const lastFactura = ref(null)

  function agregarProducto(producto) {
    if (producto.tipo === 'variable') return
    const maxStock = producto.stock === -1 ? -1 : Number(producto.stock ?? 0)
    if (maxStock === 0) return
    const key = lineKeyFor(producto.id, null)
    const found = items.value.find((i) => i.lineKey === key)
    if (found) {
      if (maxStock >= 0 && found.cantidad >= maxStock) return
      found.cantidad += 1
      return
    }
    items.value.push({
      lineKey: key,
      productId: producto.id,
      variationId: null,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: 1,
      maxStock,
    })
  }

  function agregarVariacion({ productId, variationId, nombre, precio, stock }) {
    const maxStock = stock === -1 ? -1 : Number(stock ?? 0)
    if (maxStock === 0) return
    const key = lineKeyFor(productId, variationId)
    const found = items.value.find((i) => i.lineKey === key)
    if (found) {
      if (maxStock >= 0 && found.cantidad >= maxStock) return
      found.cantidad += 1
      return
    }
    items.value.push({
      lineKey: key,
      productId,
      variationId,
      nombre,
      precio: Number(precio),
      cantidad: 1,
      maxStock,
    })
  }

  function agregarLinea(producto, cantidad) {
    const q = Math.max(1, Math.floor(Number(cantidad) || 1))
    const variationId = producto.variationId != null ? producto.variationId : null
    const key = lineKeyFor(producto.id, variationId)
    const maxStock = producto.maxStock != null ? producto.maxStock : -1
    const found = items.value.find((i) => i.lineKey === key)
    if (found) {
      const cap = maxStock >= 0 ? maxStock : Infinity
      found.cantidad = Math.min(found.cantidad + q, cap)
      return
    }
    items.value.push({
      lineKey: key,
      productId: producto.id,
      variationId,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      cantidad: Math.min(q, maxStock >= 0 ? maxStock : q),
      maxStock: maxStock >= 0 ? maxStock : -1,
    })
  }

  function incrementar(lineKey) {
    const found = items.value.find((i) => i.lineKey === lineKey)
    if (!found) return
    if (found.maxStock >= 0 && found.cantidad >= found.maxStock) return
    found.cantidad += 1
  }

  function decrementar(lineKey) {
    const found = items.value.find((i) => i.lineKey === lineKey)
    if (!found) return
    if (found.cantidad <= 1) {
      eliminar(lineKey)
      return
    }
    found.cantidad -= 1
  }

  function eliminar(lineKey) {
    items.value = items.value.filter((i) => i.lineKey !== lineKey)
  }

  function limpiar() {
    items.value = []
  }

  function descartarUltimaFactura() {
    lastFactura.value = null
  }

  const total = computed(() =>
    items.value.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
  )

  async function crearOrden(cliente, paymentMethod) {
    creatingOrder.value = true
    orderError.value = ''
    orderSuccess.value = ''
    try {
      if (!Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
        throw new Error('Debes seleccionar un metodo de pago')
      }
      const payload = {
        paymentMethod,
        items: items.value.map(({ productId, variationId, cantidad }) => ({
          productId,
          ...(variationId != null && variationId !== '' ? { variationId } : {}),
          cantidad,
        })),
      }
      if (
        cliente &&
        (cliente.id != null ||
          (cliente.nombre && String(cliente.nombre).trim()) ||
          (cliente.telefono && String(cliente.telefono).trim()))
      ) {
        payload.cliente = {
          ...(cliente.id != null ? { id: cliente.id } : {}),
          nombre: cliente.nombre ? String(cliente.nombre).trim() : '',
          telefono: cliente.telefono ? String(cliente.telefono).trim() : '',
        }
      }
      const itemsSnapshot = items.value.map((i) => ({
        nombre: i.nombre,
        cantidad: i.cantidad,
        precio: i.precio,
        total: i.precio * i.cantidad,
      }))
      const totalNum = items.value.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
      const cli = cliente || {}
      const { data } = await api.post('/orden', payload)
      const metodoPago = paymentMethodLabel(paymentMethod)
      const nombreCliente =
        cli.nombre && String(cli.nombre).trim()
          ? String(cli.nombre).trim()
          : cli.id != null
            ? `Cliente #${cli.id}`
            : 'Mostrador'
      lastFactura.value = {
        id: String(data.orderId),
        fecha: new Date().toISOString(),
        cliente: {
          nombre: nombreCliente,
          documento: cli.telefono ? String(cli.telefono).trim() : '',
        },
        items: itemsSnapshot,
        total: totalNum,
        metodo_pago: metodoPago || 'POS',
      }
      orderSuccess.value = `Orden #${data.orderId} creada correctamente`
      limpiar()
      return data
    } catch (err) {
      orderError.value =
        err?.response?.data?.error || err?.message || 'No se pudo crear la orden'
      throw err
    } finally {
      creatingOrder.value = false
    }
  }

  return {
    items,
    creatingOrder,
    orderError,
    orderSuccess,
    lastFactura,
    total,
    agregarProducto,
    agregarVariacion,
    agregarLinea,
    incrementar,
    decrementar,
    eliminar,
    limpiar,
    crearOrden,
    descartarUltimaFactura,
  }
})
