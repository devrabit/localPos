<script setup>
import { computed, ref, watch } from 'vue'
import api from '../services/api'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'confirm'])

const selectedId = ref(null)
const loading = ref(true)
const error = ref('')
const loadedVariaciones = ref([])

async function cargarVariaciones() {
  error.value = ''
  selectedId.value = null
  const cached = Array.isArray(props.product.variaciones) ? props.product.variaciones : []
  loadedVariaciones.value = cached.length ? [...cached] : []
  loading.value = !loadedVariaciones.value.length
  const pickFirst = () => {
    const first = loadedVariaciones.value.find((x) => x.stock !== 0)
    if (first) selectedId.value = first.variationId
  }
  if (loadedVariaciones.value.length) pickFirst()
  try {
    const { data } = await api.get(`/productos/${props.product.id}/variaciones`)
    loadedVariaciones.value = data.variaciones || []
    pickFirst()
  } catch (e) {
    error.value = e?.response?.data?.error || 'Error cargando variaciones'
  } finally {
    loading.value = false
  }
}

watch(
  () => props.product.id,
  () => {
    cargarVariaciones()
  },
  { immediate: true },
)

const selected = computed(() =>
  loadedVariaciones.value.find((v) => v.variationId === selectedId.value),
)

function puedeAgregar(v) {
  return v.stock === -1 || v.stock > 0
}

function confirmar() {
  const v = selected.value
  if (!v || !puedeAgregar(v)) return
  emit('confirm', {
    productId: props.product.id,
    variationId: v.variationId,
    nombre: v.nombre,
    precio: v.precio,
    stock: v.stock,
  })
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    @click.self="emit('close')"
  >
    <div
      class="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
      @click.stop
    >
      <div class="border-b border-slate-200 px-4 py-3">
        <h3 class="text-lg font-semibold text-slate-900">{{ product.nombre }}</h3>
        <p class="text-sm text-slate-500">Elige una variacion para agregar al carrito</p>
      </div>
      <div class="max-h-[50vh] overflow-y-auto p-3">
        <p v-if="loading" class="p-6 text-center text-slate-600">Cargando opciones...</p>
        <p v-else-if="error" class="rounded-lg bg-rose-50 p-4 text-center text-rose-700">
          {{ error }}
        </p>
        <p
          v-else-if="!loadedVariaciones.length"
          class="p-4 text-center text-slate-500"
        >
          No hay variaciones disponibles.
        </p>
        <div v-else class="space-y-2">
          <label
            v-for="v in loadedVariaciones"
            :key="v.variationId"
            class="flex cursor-pointer gap-3 rounded-xl border p-3 transition"
            :class="
              !puedeAgregar(v)
                ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60'
                : selectedId === v.variationId
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 hover:border-indigo-300'
            "
          >
            <input
              v-model.number="selectedId"
              type="radio"
              class="mt-1 h-5 w-5"
              :value="v.variationId"
              :disabled="!puedeAgregar(v)"
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-slate-900">{{ v.nombre }}</p>
              <p class="text-sm text-indigo-700">$ {{ Number(v.precio).toFixed(2) }}</p>
              <p class="text-xs text-slate-500">
                Stock:
                {{ v.stock === -1 ? 'Sin limite' : v.stock }}
              </p>
            </div>
          </label>
        </div>
      </div>
      <div class="flex gap-2 border-t border-slate-200 p-4">
        <button
          type="button"
          class="min-h-12 flex-1 rounded-lg border border-slate-300 font-semibold text-slate-800"
          @click="emit('close')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="min-h-12 flex-1 rounded-lg bg-indigo-600 font-semibold text-white disabled:bg-slate-300"
          :disabled="loading || !selected || !puedeAgregar(selected)"
          @click="confirmar"
        >
          Agregar
        </button>
      </div>
    </div>
  </div>
</template>
