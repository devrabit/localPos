import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createSalida, getSalidas } from '../services/salidasService'

const TIPOS_PAGO = ['efectivo', 'transferencia_virtual']

export const useSalidasStore = defineStore('salidas', () => {
  const salidas = ref([])
  const filtros = ref({
    fechaInicio: '',
    fechaFin: '',
  })
  const motivo = ref('')
  const suma = ref('')
  const tipoPago = ref('')
  const loading = ref(false)
  const error = ref('')
  const success = ref('')
  const totalFiltrado = computed(() =>
    salidas.value.reduce((acc, item) => acc + Number(item.suma || 0), 0),
  )

  function validateForm() {
    const motivoTrim = motivo.value.trim()
    const tipo = tipoPago.value
    const sumaNumber = Number(suma.value)

    if (!motivoTrim) return 'El motivo es obligatorio'
    if (!Number.isFinite(sumaNumber) || sumaNumber <= 0) return 'La suma debe ser mayor a 0'
    if (!TIPOS_PAGO.includes(tipo)) return 'Selecciona un tipo de pago valido'

    return ''
  }

  async function fetchSalidas() {
    loading.value = true
    error.value = ''
    try {
      const params = {}
      if (filtros.value.fechaInicio) params.fechaInicio = filtros.value.fechaInicio
      if (filtros.value.fechaFin) params.fechaFin = filtros.value.fechaFin
      const { data } = await getSalidas(params)
      salidas.value = Array.isArray(data?.salidas) ? data.salidas : []
    } catch (err) {
      error.value = err?.response?.data?.error || 'No se pudieron cargar las salidas'
      salidas.value = []
    } finally {
      loading.value = false
    }
  }

  async function guardarSalida() {
    error.value = ''
    success.value = ''

    const validationError = validateForm()
    if (validationError) {
      error.value = validationError
      return false
    }

    loading.value = true
    try {
      await createSalida({
        motivo: motivo.value.trim(),
        suma: Number(suma.value),
        tipoPago: tipoPago.value,
      })

      success.value = 'Salida registrada correctamente'
      motivo.value = ''
      suma.value = ''
      tipoPago.value = ''
      return true
    } catch (err) {
      error.value = err?.response?.data?.error || 'No se pudo registrar la salida'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    salidas,
    filtros,
    motivo,
    suma,
    tipoPago,
    loading,
    error,
    success,
    totalFiltrado,
    fetchSalidas,
    guardarSalida,
  }
})
