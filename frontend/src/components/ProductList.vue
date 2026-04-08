<script setup>
defineProps({
  productos: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add', 'pick-variable'])
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <h2 class="mb-3 text-xl font-semibold text-slate-900">Productos</h2>
    <p v-if="loading" class="mb-3 rounded-lg bg-slate-100 px-4 py-3 text-base text-slate-600">
      Cargando catalogo...
    </p>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <button
        v-for="producto in productos"
        :key="producto.id"
        type="button"
        class="min-h-[3.5rem] rounded-lg border border-slate-200 p-4 text-left text-base transition active:bg-indigo-100 hover:border-indigo-300 hover:bg-indigo-50"
        :class="producto.tipo === 'variable' ? 'border-amber-200 bg-amber-50/40' : ''"
        @click="
          producto.tipo === 'variable' ? emit('pick-variable', producto) : emit('add', producto)
        "
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-base font-semibold text-slate-900">{{ producto.nombre }}</p>
          <span
            v-if="producto.tipo === 'variable'"
            class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
          >
            Variaciones
          </span>
        </div>
        <p class="text-sm text-slate-500">SKU: {{ producto.sku || 'N/A' }}</p>
        <p class="mt-1 text-lg font-bold text-indigo-700">
          <template v-if="producto.tipo === 'variable'">
            <span v-if="Number(producto.precio) > 0">
              Desde $ {{ Number(producto.precio).toFixed(2) }}
            </span>
            <span v-else class="text-base font-semibold text-slate-600">Precio al elegir variacion</span>
          </template>
          <template v-else> $ {{ Number(producto.precio).toFixed(2) }} </template>
        </p>
        <p class="text-xs text-slate-500">
          <template v-if="producto.tipo === 'variable'">
            Variaciones se cargan al abrir (lazy)
          </template>
          <template v-else>
            Stock:
            {{ producto.stock === -1 ? 'Sin limite' : producto.stock }}
          </template>
        </p>
      </button>
    </div>
  </section>
</template>
