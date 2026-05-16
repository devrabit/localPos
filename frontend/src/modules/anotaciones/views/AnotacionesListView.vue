<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../../services/api'
import { formatFecha } from '../formatDisplay'

const router = useRouter()
const loading = ref(true)
const error = ref('')
const anotaciones = ref([])

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/anotaciones')
    anotaciones.value = Array.isArray(data.anotaciones) ? data.anotaciones : []
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error cargando anotaciones'
    anotaciones.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
})

function irDetalle(row) {
  router.push({ name: 'anotaciones-detalle', params: { id: row.id } })
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Anotaciones</h1>
        <p class="text-sm text-slate-500">Peticiones de clientes y recordatorios</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/anotaciones/nueva"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Agregar Anotación
        </router-link>
        <router-link
          to="/"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Volver al POS
        </router-link>
      </div>
    </header>

    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>

    <p v-if="loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando...
    </p>

    <div
      v-else-if="!anotaciones.length"
      class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500"
    >
      No hay anotaciones aún.
      <router-link to="/anotaciones/nueva" class="ml-1 font-semibold text-indigo-600 underline">
        Agregar una
      </router-link>
    </div>

    <div v-else class="overflow-hidden rounded-xl bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Título</th>
              <th class="px-4 py-3 font-semibold">Cliente</th>
              <th class="px-4 py-3 font-semibold">Marca</th>
              <th class="px-4 py-3 font-semibold">Producto</th>
              <th class="px-4 py-3 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="a in anotaciones"
              :key="a.id"
              class="cursor-pointer hover:bg-slate-50"
              role="button"
              tabindex="0"
              @click="irDetalle(a)"
              @keydown.enter="irDetalle(a)"
            >
              <td class="px-4 py-3 font-medium text-slate-900">{{ a.titulo }}</td>
              <td class="px-4 py-3 text-slate-700">{{ a.cliente || '—' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ a.marca || '—' }}</td>
              <td class="px-4 py-3 text-slate-700">{{ a.producto || '—' }}</td>
              <td class="px-4 py-3 text-slate-600">{{ formatFecha(a.fecha) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
