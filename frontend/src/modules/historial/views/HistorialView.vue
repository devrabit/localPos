<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FiltrosHistorial from '../components/FiltrosHistorial.vue'
import VentaItem from '../components/VentaItem.vue'
import { useHistorialStore } from '../store/historialStore'

const router = useRouter()
const store = useHistorialStore()

onMounted(() => {
  store.fetchVentas({ useCache: true })
})

function verDetalle(venta) {
  router.push({ name: 'historial-detalle', params: { id: venta.id } })
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Historial de ventas</h1>
        <p class="text-sm text-slate-500">Pedidos sincronizados con WooCommerce</p>
      </div>
      <router-link
        to="/"
        class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
      >
        Volver al POS
      </router-link>
    </header>

    <FiltrosHistorial class="mb-4" />

    <p v-if="store.error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ store.error }}
    </p>

    <p v-if="store.loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando pedidos...
    </p>

    <div v-else-if="!store.ordenes.length" class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
      No hay ventas con los filtros actuales.
    </div>

    <div v-else class="space-y-3">
      <VentaItem v-for="v in store.ordenes" :key="v.id" :venta="v" @select="verDetalle" />
    </div>

    <nav
      v-if="!store.loading && store.totalPages > 1"
      class="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-white p-4 shadow-sm"
    >
      <button
        type="button"
        class="min-h-12 rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:opacity-40"
        :disabled="store.page <= 1"
        @click="store.irPagina(store.page - 1)"
      >
        Anterior
      </button>
      <span class="text-slate-700">
        Pagina {{ store.page }} de {{ store.totalPages }} ({{ store.total }} pedidos)
      </span>
      <button
        type="button"
        class="min-h-12 rounded-lg border border-slate-300 px-4 py-2 font-medium disabled:opacity-40"
        :disabled="store.page >= store.totalPages"
        @click="store.irPagina(store.page + 1)"
      >
        Siguiente
      </button>
    </nav>
  </main>
</template>
