import { ref } from 'vue'
import { defineStore } from 'pinia'
import api from '../services/api'

export const useClientesStore = defineStore('clientes', () => {
  const clientes = ref([])
  const loading = ref(false)
  const creating = ref(false)
  const error = ref('')
  const selectedCliente = ref(null)

  async function cargarClientes() {
    loading.value = true
    error.value = ''
    try {
      const { data } = await api.get('/clientes')
      clientes.value = data
    } catch (err) {
      error.value = err?.response?.data?.error || 'Error cargando clientes'
    } finally {
      loading.value = false
    }
  }

  async function crearCliente(payload) {
    creating.value = true
    error.value = ''
    try {
      const { data } = await api.post('/clientes', payload)
      clientes.value.unshift(data)
      selectedCliente.value = data
      return true
    } catch (err) {
      error.value = err?.response?.data?.error || 'No se pudo crear el cliente'
      return false
    } finally {
      creating.value = false
    }
  }

  return {
    clientes,
    loading,
    creating,
    error,
    selectedCliente,
    cargarClientes,
    crearCliente,
  }
})
