<script setup>
import { useHistorialStore } from '../store/historialStore'

const store = useHistorialStore()

function limpiarFiltros() {
  store.filtros.fechaInicio = ''
  store.filtros.fechaFin = ''
  store.filtros.cliente = ''
  store.filtros.estado = ''
  store.aplicarFiltrosEstructurados()
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 class="mb-3 text-lg font-semibold text-slate-900">Filtros</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600">Desde</span>
        <input
          v-model="store.filtros.fechaInicio"
          type="date"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          @change="store.aplicarFiltrosEstructurados"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600">Hasta</span>
        <input
          v-model="store.filtros.fechaFin"
          type="date"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          @change="store.aplicarFiltrosEstructurados"
        />
      </label>
      <label class="block sm:col-span-2 lg:col-span-1">
        <span class="mb-1 block text-sm text-slate-600">Cliente o N° pedido</span>
        <input
          v-model="store.filtros.cliente"
          type="text"
          placeholder="Nombre o solo numeros para ID"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          @input="store.scheduleFetchVentasCliente"
        />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm text-slate-600">Estado</span>
        <select
          v-model="store.filtros.estado"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          @change="store.aplicarFiltrosEstructurados"
        >
          <option value="">Todos</option>
          <option value="completed">Completado</option>
          <option value="pending">Pendiente / proceso</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </label>
    </div>
    <button
      type="button"
      class="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      @click="limpiarFiltros"
    >
      Limpiar filtros
    </button>
  </section>
</template>
