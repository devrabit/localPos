<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  clientes: {
    type: Array,
    required: true,
  },
  selectedCliente: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  creating: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select', 'create'])

const query = ref('')
const nombre = ref('')
const telefono = ref('')
const email = ref('')

const clientesFiltrados = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.clientes
  return props.clientes.filter((c) => {
    const n = c.nombre?.toLowerCase() || ''
    const t = c.telefono?.toLowerCase() || ''
    return n.includes(q) || t.includes(q)
  })
})

function onCreate() {
  if (!nombre.value.trim()) return
  emit('create', {
    nombre: nombre.value.trim(),
    telefono: telefono.value.trim(),
    email: email.value.trim(),
  })
}

function resetCreacionForm() {
  nombre.value = ''
  telefono.value = ''
  email.value = ''
}

defineExpose({ resetCreacionForm })
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <h2 class="mb-1 text-xl font-semibold text-slate-900">Cliente</h2>
    <p class="mb-3 text-sm text-slate-500">Opcional: puedes vender sin seleccionar cliente (mostrador).</p>
    <input
      v-model="query"
      type="text"
      placeholder="Buscar cliente por nombre o telefono"
      class="mb-3 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
    />
    <p v-if="loading" class="mb-2 text-base text-slate-500">Cargando clientes...</p>
    <div class="max-h-56 space-y-2 overflow-auto">
      <button
        v-for="cliente in clientesFiltrados"
        :key="cliente.id"
        type="button"
        class="min-h-14 w-full rounded-lg border p-4 text-left text-base active:bg-slate-50"
        :class="selectedCliente?.id === cliente.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'"
        @click="emit('select', cliente)"
      >
        <p class="font-medium text-slate-900">{{ cliente.nombre }}</p>
        <p class="text-sm text-slate-500">{{ cliente.telefono || 'Sin telefono' }}</p>
      </button>
    </div>

    <div class="mt-4 border-t border-slate-200 pt-3">
      <p class="mb-2 text-sm font-semibold text-slate-700">Crear cliente rapido</p>
      <p v-if="error" class="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {{ error }}
      </p>
      <input
        v-model="nombre"
        type="text"
        placeholder="Nombre"
        class="mb-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
      />
      <input
        v-model="telefono"
        type="text"
        placeholder="Telefono"
        class="mb-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
      />
      <input
        v-model="email"
        type="email"
        inputmode="email"
        autocomplete="email"
        placeholder="Email (opcional)"
        class="mb-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
      />
      <button
        type="button"
        class="min-h-14 w-full rounded-lg bg-slate-900 px-4 py-4 text-base font-semibold text-white disabled:bg-slate-400"
        :disabled="creating"
        @click="onCreate"
      >
        {{ creating ? 'Creando...' : 'Crear cliente' }}
      </button>
    </div>
  </section>
</template>
