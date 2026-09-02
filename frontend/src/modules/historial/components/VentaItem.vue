<script setup>
defineProps({
  venta: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['select'])

function labelEstado(s) {
  const m = {
    completed: 'Completado',
    processing: 'Procesando',
    pending: 'Pendiente',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
    failed: 'Fallido',
    'on-hold': 'En espera',
  }
  return m[s] || s
}
</script>

<template>
  <button
    type="button"
    class="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 active:bg-indigo-100 sm:flex-row sm:items-center sm:justify-between"
    @click="emit('select', venta)"
  >
    <div>
      <p class="text-lg font-semibold text-slate-900">Pedido #{{ venta.id }}</p>
      <p class="text-base text-slate-600">{{ venta.cliente }}</p>
    </div>
    <div class="flex flex-wrap items-end gap-3 sm:text-right">
      <div>
        <p class="text-xs uppercase text-slate-500">Total</p>
        <p class="text-lg font-bold text-indigo-700">$ {{ Number(venta.total).toLocaleString('es-CO') }}</p>
      </div>
      <div>
        <p class="text-xs uppercase text-slate-500">Fecha</p>
        <p class="text-sm font-medium text-slate-800">{{ venta.fecha }}</p>
      </div>
      <div>
        <p class="text-xs uppercase text-slate-500">Pago</p>
        <p class="text-sm font-medium text-slate-800">{{ venta.metodoPago || '-' }}</p>
      </div>
      <span
        class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
      >
        {{ labelEstado(venta.estado) }}
      </span>
    </div>
  </button>
</template>
