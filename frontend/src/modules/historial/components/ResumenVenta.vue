<script setup>
defineProps({
  detalle: {
    type: Object,
    required: true,
  },
})

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
  <div class="space-y-4">
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 class="mb-2 text-sm font-semibold uppercase text-slate-500">Cliente</h3>
      <p class="text-lg font-medium text-slate-900">{{ detalle.cliente }}</p>
      <p v-if="detalle.telefono" class="text-slate-600">{{ detalle.telefono }}</p>
      <p v-if="detalle.email" class="text-sm text-slate-500">{{ detalle.email }}</p>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <h3 class="mb-2 text-sm font-semibold uppercase text-slate-500">Pedido</h3>
      <dl class="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-slate-500">Fecha</dt>
          <dd class="font-medium text-slate-900">{{ detalle.fecha?.replace('T', ' ').slice(0, 19) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Estado</dt>
          <dd class="font-medium text-slate-900">{{ labelEstado(detalle.estado) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Pago</dt>
          <dd class="font-medium text-slate-900">{{ detalle.metodoPago }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Total</dt>
          <dd class="text-lg font-bold text-indigo-700">$ {{ Number(detalle.total).toLocaleString('es-CO') }}</dd>
        </div>
      </dl>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <h3 class="mb-3 text-sm font-semibold uppercase text-slate-500">Productos</h3>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="(item, idx) in detalle.items"
          :key="idx"
          class="flex flex-wrap items-baseline justify-between gap-2 py-3"
        >
          <div>
            <p class="font-medium text-slate-900">{{ item.nombre }}</p>
            <p class="text-sm text-slate-500">
              {{ item.cantidad }} x $ {{ Number(item.precio).toLocaleString('es-CO') }}
            </p>
          </div>
          <p class="font-semibold text-slate-800">$ {{ Number(item.lineTotal).toLocaleString('es-CO') }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>
