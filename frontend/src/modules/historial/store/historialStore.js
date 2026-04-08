import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getVentas, getVentaById } from '../services/historialService'

const CACHE_TTL_MS = 30_000
let cacheKey = ''
let cachePayload = null
let cacheAt = 0

export const useHistorialStore = defineStore('historial', () => {
  const ordenes = ref([])
  const detalle = ref(null)
  const loading = ref(false)
  const error = ref('')
  const page = ref(1)
  const limit = ref(20)
  const total = ref(0)
  const totalPages = ref(1)
  const filtros = ref({
    fechaInicio: '',
    fechaFin: '',
    cliente: '',
    estado: '',
  })

  let debounceTimer = null

  function buildParams() {
    const f = filtros.value
    return {
      ...(f.fechaInicio ? { fechaInicio: f.fechaInicio } : {}),
      ...(f.fechaFin ? { fechaFin: f.fechaFin } : {}),
      ...(f.cliente.trim() ? { cliente: f.cliente.trim() } : {}),
      ...(f.estado ? { estado: f.estado } : {}),
      page: page.value,
      limit: limit.value,
    }
  }

  function paramsKey() {
    return JSON.stringify(buildParams())
  }

  async function fetchVentas(options = {}) {
    const { useCache = false } = options
    if (useCache) {
      const k = paramsKey()
      if (k === cacheKey && Date.now() - cacheAt < CACHE_TTL_MS && cachePayload) {
        ordenes.value = cachePayload.ordenes
        total.value = cachePayload.total
        totalPages.value = cachePayload.totalPages
        return
      }
    }

    loading.value = true
    error.value = ''
    try {
      const { data } = await getVentas(buildParams())
      ordenes.value = data.ordenes || []
      total.value = data.total ?? 0
      totalPages.value = Math.max(1, Number(data.totalPages) || 1)
      cacheKey = paramsKey()
      cacheAt = Date.now()
      cachePayload = {
        ordenes: ordenes.value,
        total: total.value,
        totalPages: totalPages.value,
      }
    } catch (err) {
      error.value = err?.response?.data?.error || 'Error cargando historial'
      ordenes.value = []
      total.value = 0
      totalPages.value = 1
    } finally {
      loading.value = false
    }
  }

  function scheduleFetchVentasCliente() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      page.value = 1
      fetchVentas()
    }, 300)
  }

  function aplicarFiltrosEstructurados() {
    page.value = 1
    fetchVentas()
  }

  function irPagina(nueva) {
    const p = Math.min(Math.max(1, nueva), totalPages.value || 1)
    page.value = p
    fetchVentas()
  }

  async function fetchDetalle(id) {
    loading.value = true
    error.value = ''
    detalle.value = null
    try {
      const { data } = await getVentaById(id)
      detalle.value = data
    } catch (err) {
      error.value = err?.response?.data?.error || 'Error cargando el pedido'
    } finally {
      loading.value = false
    }
  }

  return {
    ordenes,
    detalle,
    loading,
    error,
    filtros,
    page,
    limit,
    total,
    totalPages,
    fetchVentas,
    scheduleFetchVentasCliente,
    aplicarFiltrosEstructurados,
    irPagina,
    fetchDetalle,
  }
})
