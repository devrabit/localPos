<script setup>
import { nextTick, ref } from 'vue'

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

const emit = defineEmits(['update:modelValue', 'update:modo', 'enter'])

const campoRef = ref(null)
const botonEscanearRef = ref(null)

function quitarFoco() {
  campoRef.value?.blur()
  botonEscanearRef.value?.blur()
}

function entrarEnEscanear() {
  emit('update:modo', 'escanear')
  quitarFoco()
  nextTick(quitarFoco)
}

function entrarEnBuscar() {
  emit('update:modo', 'buscar')
  nextTick(() => campoRef.value?.focus())
}
</script>

<template>
  <div>
    <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <input
        ref="campoRef"
        :value="modelValue"
        type="text"
        data-no-barcode-scan
        :disabled="modo === 'escanear'"
        class="min-h-12 min-w-0 w-full flex-1 rounded-lg border border-slate-300 px-3 py-3 text-base disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
          ref="botonEscanearRef"
          type="button"
          class="min-h-10 flex-1 rounded-md px-3 text-sm font-semibold sm:flex-none"
          :class="
            modo === 'escanear' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          "
          :aria-pressed="modo === 'escanear'"
          @mousedown.prevent
          @click="entrarEnEscanear"
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
          @click="entrarEnBuscar"
        >
          Manual
        </button>
      </div>
    </div>
    <p v-if="cargando" class="mt-2 text-sm font-medium text-slate-600" role="status">
      Buscando codigo...
    </p>
    <p v-else class="mt-1 text-xs text-slate-500">
      {{
        modo === 'escanear'
          ? 'Modo escanear: el lector esta activo y el campo esta bloqueado.'
          : 'Modo manual: el lector esta apagado. Escribe para filtrar.'
      }}
    </p>
  </div>
</template>
