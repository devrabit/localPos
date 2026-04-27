<script setup>
import { useSalidasStore } from '../store/salidasStore'

const store = useSalidasStore()

async function onSubmit() {
  await store.guardarSalida()
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Salidas</h1>
        <p class="text-sm text-slate-500">Registro de egresos de dinero de la tienda</p>
      </div>
      <router-link
        to="/salidas"
        class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
      >
        Ver historial
      </router-link>
    </header>

    <section class="rounded-xl bg-white p-4 shadow-sm md:p-6">
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label for="motivo" class="mb-1 block text-sm font-medium text-slate-700">Motivo</label>
          <input
            id="motivo"
            v-model.trim="store.motivo"
            type="text"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            placeholder="Ej: Pago proveedor de insumos"
            required
          />
        </div>

        <div>
          <label for="suma" class="mb-1 block text-sm font-medium text-slate-700">Suma</label>
          <input
            id="suma"
            v-model="store.suma"
            type="number"
            min="0.01"
            step="0.01"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label for="tipo-pago" class="mb-1 block text-sm font-medium text-slate-700">Tipo de pago</label>
          <select
            id="tipo-pago"
            v-model="store.tipoPago"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            required
          >
            <option disabled value="">Selecciona una opcion</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia_virtual">Transferencia virtual</option>
          </select>
        </div>

        <button
          type="submit"
          class="min-h-12 rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="store.loading"
        >
          {{ store.loading ? 'Guardando...' : 'Guardar salida' }}
        </button>
      </form>
    </section>

    <p v-if="store.error" class="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ store.error }}
    </p>
    <p v-if="store.success" class="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
      {{ store.success }}
    </p>
  </main>
</template>
