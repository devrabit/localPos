import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as pedidosService from '../services/pedidosService'

export const usePedidosStore = defineStore('pedidos', () => {
  const pedidos = ref([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const loading = ref(false)
  const error = ref('')

  async function cargar({ page: p = page.value, limit: l = limit.value } = {}) {
    loading.value = true
    error.value = ''
    try {
      const data = await pedidosService.listPedidos({ page: p, limit: l })
      pedidos.value = Array.isArray(data.pedidos) ? data.pedidos : []
      total.value = Number(data.total) || 0
      page.value = Number(data.page) || p
      limit.value = Number(data.limit) || l
    } catch (err) {
      error.value =
        err?.response?.data?.error ||
        (typeof err?.message === 'string' ? err.message : '') ||
        'Error cargando pedidos'
      pedidos.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function crear(payload) {
    return pedidosService.createPedido(payload)
  }

  return {
    pedidos,
    total,
    page,
    limit,
    loading,
    error,
    cargar,
    crear,
  }
})
