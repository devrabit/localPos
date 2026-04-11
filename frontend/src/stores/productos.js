import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'

const CACHE_KEY = 'pos_productos_cache_v4'

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
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch (err) {
      error.value = err?.response?.data?.error || 'Error cargando productos'
    } finally {
      loading.value = false
    }
  }

  const productosFiltrados = computed(() => {
    const value = query.value.trim().toLowerCase()
    if (!value) return productos.value
    return productos.value.filter((p) => {
      const nombre = p.nombre?.toLowerCase() || ''
      const sku = p.sku?.toLowerCase() || ''
      return nombre.includes(value) || sku.includes(value)
    })
  })

  return {
    productos,
    query,
    loading,
    error,
    productosFiltrados,
    hydrateCache,
    cargarProductos,
  }
})
