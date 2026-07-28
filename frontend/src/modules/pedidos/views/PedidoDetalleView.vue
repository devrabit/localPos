<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as pedidosService from '../services/pedidosService'
import { PEDIDO_ESTADOS, etiquetaEstado, formatFechaPedido } from '../pedidoEstados'
import { descargarPedidoPdf } from '../utils/pedidoPdf'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const savingEstado = ref(false)
const error = ref('')
const pedido = ref(null)
const estadoLocal = ref('en_proceso')

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    const data = await pedidosService.getPedido(route.params.id)
    pedido.value = data
    estadoLocal.value = data.estado
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error cargando pedido'
    pedido.value = null
  } finally {
    loading.value = false
  }
}

async function guardarEstado() {
  if (!pedido.value) return
  savingEstado.value = true
  error.value = ''
  try {
    const updated = await pedidosService.updatePedidoEstado(pedido.value.id, estadoLocal.value)
    pedido.value = updated
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error actualizando estado'
  } finally {
    savingEstado.value = false
  }
}

async function onDescargarPdf() {
  if (!pedido.value) return
  try {
    await descargarPedidoPdf(pedido.value)
  } catch (err) {
    error.value = err?.message || 'No se pudo abrir el PDF'
  }
}

onMounted(() => {
  cargar()
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Detalle del pedido</h1>
        <p class="text-sm text-slate-500">Solo MySQL — sin WordPress</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/pedidos"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Volver al listado
        </router-link>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
          @click="router.push('/')"
        >
          POS
        </button>
      </div>
    </header>

    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>
    <p v-if="loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando...
    </p>

    <template v-else-if="pedido">
      <section class="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-slate-500">ID</p>
        <p class="font-mono text-sm text-slate-800">{{ pedido.id }}</p>
        <p class="mt-3 text-sm text-slate-500">Fecha</p>
        <p class="text-base text-slate-900">{{ formatFechaPedido(pedido.fechaCreacion) }}</p>
        <p class="mt-3 text-sm text-slate-500">Dirigido a</p>
        <p class="text-lg font-semibold text-slate-900">{{ pedido.dirigidoA }}</p>
        <p class="mt-3 text-sm text-slate-500">Estado actual</p>
        <p class="text-base text-slate-900">{{ etiquetaEstado(pedido.estado) }}</p>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="estado">
              Cambiar estado
            </label>
            <select
              id="estado"
              v-model="estadoLocal"
              class="min-h-12 rounded-lg border border-slate-300 px-3 py-2 text-base"
            >
              <option v-for="e in PEDIDO_ESTADOS" :key="e.value" :value="e.value">
                {{ e.label }}
              </option>
            </select>
          </div>
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 disabled:opacity-50"
            :disabled="savingEstado || estadoLocal === pedido.estado"
            @click="guardarEstado"
          >
            {{ savingEstado ? 'Guardando...' : 'Guardar estado' }}
          </button>
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
            @click="onDescargarPdf"
          >
            Descargar PDF
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl bg-white shadow-sm">
        <div class="border-b border-slate-100 px-4 py-3">
          <h2 class="text-lg font-semibold text-slate-900">Productos</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-3 font-semibold">Producto</th>
                <th class="px-4 py-3 font-semibold">Referencia</th>
                <th class="px-4 py-3 font-semibold">Cantidad</th>
                <th class="px-4 py-3 font-semibold">Descripcion</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="it in pedido.items" :key="it.id">
                <td class="px-4 py-3 font-medium text-slate-900">{{ it.nombreProducto }}</td>
                <td class="px-4 py-3 text-slate-700">{{ it.referencia }}</td>
                <td class="px-4 py-3 text-slate-700">{{ it.cantidad }}</td>
                <td class="px-4 py-3 text-slate-600">{{ it.descripcion || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>
