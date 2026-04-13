import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'

const CACHE_KEY = 'pos_productos_cache_v7'

export const useProductosStore = defineStore('productos', () => {
  const productos = ref([])
  const query = ref('')
  const loading = ref(false)
  const error = ref('')

  function hydrateCache() {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        productos.value = parsed
      }
    } catch {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  async function cargarProductos() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/productos')
      productos.value = data
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data))
      } catch {
        /* Catalogo grande: cuota de localStorage; la sesion sigue en memoria. */
      }
    } catch (err) {
      error.value =
        err?.response?.data?.error ||
        (typeof err?.message === 'string' ? err.message : '') ||
        'Error cargando productos'
    } finally {
      loading.value = false
    }
  }

  /** Texto en el buscador: nombre o SKU del producto padre (no variaciones; esas las resuelve Woo via /escaneo). */
  function coincidenciasBusqueda(termino) {
    const value = String(termino ?? '').trim().toLowerCase()
    if (!value) return productos.value
    return productos.value.filter((p) => {
      const nombre = p.nombre?.toLowerCase() || ''
      const sku = p.sku?.toLowerCase() || ''
      return nombre.includes(value) || sku.includes(value)
    })
  }

  /** Lector / codigo: solo SKU exacto del padre en cache (como Woo: variacion la resuelve el servidor). */
  function coincidenciasEscaneoLocales(termino) {
    const value = String(termino ?? '').trim().toLowerCase()
    if (!value) return []
    return productos.value.filter((p) => (p.sku || '').trim().toLowerCase() === value)
  }

  const productosFiltrados = computed(() => coincidenciasBusqueda(query.value))

  return {
    productos,
    query,
    loading,
    error,
    productosFiltrados,
    coincidenciasBusqueda,
    coincidenciasEscaneoLocales,
    hydrateCache,
    cargarProductos,
  }
})
