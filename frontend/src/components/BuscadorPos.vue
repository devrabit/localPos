<script setup>
defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  modo: {
    type: String,
    default: 'escanear',
  },
  cargando: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue', 'update:modo', 'enter'])
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <input
        :value="modelValue"
        type="text"
        data-no-barcode-scan
        class="min-h-12 min-w-0 w-full flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base"
        :placeholder="
          modo === 'escanear'
            ? 'Escanea el codigo. El lector lo agrega al carrito'
            : 'Buscar por nombre o codigo'
        "
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown.enter.prevent="$emit('enter')"
      />
      <div
        class="flex w-full shrink-0 rounded-lg border border-slate-300 bg-white p-1 sm:w-auto"
        role="group"
        aria-label="Modo del buscador"
      >
        <button
          type="button"
          class="min-h-10 flex-1 rounded-md px-3 text-sm font-semibold sm:flex-none"
          :class="
            modo === 'escanear' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          "
          :aria-pressed="modo === 'escanear'"
          @click="$emit('update:modo', 'escanear')"
        >
          Escanear
        </button>
        <button
          type="button"
          class="min-h-10 flex-1 rounded-md px-3 text-sm font-semibold sm:flex-none"
          :class="
            modo === 'buscar' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          "
          :aria-pressed="modo === 'buscar'"
          @click="$emit('update:modo', 'buscar')"
        >
          Buscar codigo
        </button>
      </div>
    </div>
    <p v-if="cargando" class="mt-2 text-sm font-medium text-slate-600" role="status">
      Buscando codigo...
    </p>
    <p v-else class="mt-1 text-xs text-slate-500">
      {{
        modo === 'escanear'
          ? 'Modo escanear: el lector esta activo.'
          : 'Modo buscar: el lector esta apagado. Escribe para filtrar.'
      }}
    </p>
  </div>
</template>
