<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { usePedidosStore } from '../store/pedidosStore'
import { etiquetaEstado, formatFechaPedido } from '../pedidoEstados'

const router = useRouter()
const store = usePedidosStore()
const { pedidos, total, page, limit, loading, error } = storeToRefs(store)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)))

async function cargarPagina(p) {
  await store.cargar({ page: p, limit: limit.value })
}

function irDetalle(row) {
  router.push({ name: 'pedidos-detalle', params: { id: row.id } })
}

onMounted(() => {
  cargarPagina(1)
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Pedidos</h1>
        <p class="text-sm text-slate-500">Pedidos internos del POS (no se envian a WordPress)</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/pedidos/nuevo"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Agregar pedido
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
      v-else-if="!pedidos.length"
      class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500"
    >
      No hay pedidos aun.
      <router-link to="/pedidos/nuevo" class="ml-1 font-semibold text-indigo-600 underline">
        Agregar pedido
      </router-link>
    </div>

    <div v-else class="overflow-hidden rounded-xl bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead class="bg-slate-50 text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Fecha</th>
              <th class="px-4 py-3 font-semibold">Dirigido a</th>
              <th class="px-4 py-3 font-semibold">Items</th>
              <th class="px-4 py-3 font-semibold">Estado</th>
              <th class="px-4 py-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="p in pedidos"
              :key="p.id"
              class="cursor-pointer hover:bg-slate-50"
              role="button"
              tabindex="0"
              @click="irDetalle(p)"
              @keydown.enter="irDetalle(p)"
            >
              <td class="px-4 py-3 text-slate-700">{{ formatFechaPedido(p.fechaCreacion) }}</td>
              <td class="px-4 py-3 font-medium text-slate-900">{{ p.dirigidoA }}</td>
              <td class="px-4 py-3 text-slate-700">
                {{ p.itemCount }} ({{ p.unidades }} u.)
              </td>
              <td class="px-4 py-3 text-slate-700">{{ etiquetaEstado(p.estado) }}</td>
              <td class="px-4 py-3">
                <button
                  type="button"
                  class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  @click.stop="irDetalle(p)"
                >
                  Ver
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3"
      >
        <p class="text-sm text-slate-600">
          Pagina {{ page }} de {{ totalPages }} ({{ total }} pedidos)
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
            :disabled="page <= 1 || loading"
            @click="cargarPagina(page - 1)"
          >
            Anterior
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
            :disabled="page >= totalPages || loading"
            @click="cargarPagina(page + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </main>
</template>
