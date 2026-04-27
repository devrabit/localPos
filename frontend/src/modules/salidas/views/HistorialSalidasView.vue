<script setup>
import { onMounted } from 'vue'
import { useSalidasStore } from '../store/salidasStore'

const store = useSalidasStore()

onMounted(() => {
  store.fetchSalidas()
})

function formatMonto(value) {
  return Number(value || 0).toFixed(2)
}

function formatFecha(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value || '-'
  return d.toLocaleString()
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Historial de salidas</h1>
        <p class="text-sm text-slate-500">Listado de egresos registrados</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/salidas/nueva"
          class="inline-flex min-h-12 items-center rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white"
        >
          Ingresar Salida
        </router-link>
        <router-link
          to="/"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Volver al POS
        </router-link>
      </div>
    </header>

    <section class="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="fecha-inicio">Fecha inicio</label>
          <input
            id="fecha-inicio"
            v-model="store.filtros.fechaInicio"
            type="date"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm font-medium text-slate-700" for="fecha-fin">Fecha fin</label>
          <input
            id="fecha-fin"
            v-model="store.filtros.fechaFin"
            type="date"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
        </div>
        <div class="flex items-end">
          <button
            type="button"
            class="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800"
            :disabled="store.loading"
            @click="store.fetchSalidas()"
          >
            {{ store.loading ? 'Filtrando...' : 'Filtrar' }}
          </button>
        </div>
      </div>
    </section>

    <p v-if="store.error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ store.error }}
    </p>

    <section class="rounded-xl bg-white p-4 shadow-sm">
      <p v-if="store.loading" class="text-slate-600">Cargando salidas...</p>
      <div v-else-if="!store.salidas.length" class="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
        No hay salidas para los filtros seleccionados.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-slate-600">
              <th class="px-2 py-2">Fecha</th>
              <th class="px-2 py-2">Motivo</th>
              <th class="px-2 py-2">Tipo de pago</th>
              <th class="px-2 py-2 text-right">Suma</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in store.salidas" :key="item.id" class="border-b border-slate-100">
              <td class="px-2 py-2">{{ formatFecha(item.fecha) }}</td>
              <td class="px-2 py-2">{{ item.motivo }}</td>
              <td class="px-2 py-2">{{ item.tipoPago === 'efectivo' ? 'Efectivo' : 'Transferencia virtual' }}</td>
              <td class="px-2 py-2 text-right">$ {{ formatMonto(item.suma) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="mt-4 border-t border-slate-200 pt-3 text-right text-base font-bold text-slate-900">
        Total: $ {{ formatMonto(store.totalFiltrado) }}
      </footer>
    </section>
  </main>
</template>
