<script setup>
import { onMounted, ref } from 'vue'
import api from '../../../services/api'

const loading = ref(true)
const error = ref('')
const grupos = ref([])
const total = ref(0)

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/productos/agotados')
    grupos.value = Array.isArray(data.grupos) ? data.grupos : []
    total.value = typeof data.total === 'number' ? data.total : 0
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error cargando agotados'
    grupos.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
})

function etiquetaTipo(tipo) {
  return tipo === 'variacion' ? 'Variación' : 'Simple'
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Productos agotados</h1>
        <p class="text-sm text-slate-500">
          Listado desde WooCommerce, agrupado por marca ({{ total }} ítems)
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm disabled:opacity-50"
          :disabled="loading"
          @click="cargar"
        >
          Actualizar
        </button>
        <router-link
          to="/"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Volver al POS
        </router-link>
      </div>
    </header>

    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ error }}
    </p>

    <p v-if="loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando catálogo...
    </p>

    <div
      v-else-if="!grupos.length"
      class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500"
    >
      No hay productos agotados en este momento.
    </div>

    <div v-else class="space-y-8">
      <section
        v-for="g in grupos"
        :key="g.marca"
        class="overflow-hidden rounded-xl bg-white shadow-sm"
      >
        <h2 class="border-b border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900">
          {{ g.marca }}
          <span class="ml-2 text-sm font-normal text-slate-500">({{ g.items?.length ?? 0 }})</span>
        </h2>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-3 font-semibold">Producto</th>
                <th class="px-4 py-3 font-semibold">SKU</th>
                <th class="px-4 py-3 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-slate-800">
              <tr v-for="(row, idx) in g.items" :key="`${g.marca}-${idx}-${row.productId}-${row.variationId}`">
                <td class="px-4 py-3">{{ row.nombre }}</td>
                <td class="px-4 py-3 font-mono text-xs md:text-sm">{{ row.sku || '—' }}</td>
                <td class="px-4 py-3">{{ etiquetaTipo(row.tipo) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>
