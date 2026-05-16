<script setup>
import { computed, ref } from 'vue'
import api from '../../../services/api'

const titulo = ref('')
const cliente = ref('')
const recordar = ref(false)
const fechaRecordar = ref('')
const marca = ref('')
const productoId = ref('')
const descripcion = ref('')
const productos = ref([])
const loadingProductos = ref(false)
const saving = ref(false)
const error = ref('')
const okMsg = ref('')

const puedeMostrarFechaRecordar = computed(() => recordar.value)

async function cargarProductos() {
  loadingProductos.value = true
  try {
    const { data } = await api.get('/productos')
    productos.value = Array.isArray(data) ? data : []
  } catch {
    productos.value = []
  } finally {
    loadingProductos.value = false
  }
}

function resetFormulario() {
  titulo.value = ''
  cliente.value = ''
  recordar.value = false
  fechaRecordar.value = ''
  marca.value = ''
  productoId.value = ''
  descripcion.value = ''
}

function productoNombreSeleccionado() {
  const id = Number(productoId.value)
  if (!id || Number.isNaN(id)) return ''
  const p = productos.value.find((x) => x.id === id)
  return p?.nombre || ''
}

async function guardar() {
  okMsg.value = ''
  error.value = ''
  const t = titulo.value.trim()
  if (!t) {
    error.value = 'El título es obligatorio'
    return
  }
  saving.value = true
  try {
    const pid = productoId.value === '' ? null : Number(productoId.value)
    await api.post('/anotaciones', {
      titulo: t,
      cliente: cliente.value.trim(),
      recordar: recordar.value,
      fechaRecordar: recordar.value ? fechaRecordar.value : '',
      marca: marca.value.trim(),
      productoId: pid && !Number.isNaN(pid) ? pid : null,
      productoNombre: productoNombreSeleccionado(),
      descripcion: descripcion.value,
    })
    okMsg.value = 'Se guardo la Anotacion'
    resetFormulario()
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

cargarProductos()
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Agregar Anotación</h1>
        <p class="text-sm text-slate-500">Completa los datos y guarda</p>
      </div>
      <router-link
        to="/anotaciones"
        class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
      >
        Volver a Anotaciones
      </router-link>
    </header>

    <p
      v-if="okMsg"
      class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900"
      role="status"
    >
      {{ okMsg }}
    </p>
    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>

    <form class="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm" @submit.prevent="guardar">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-titulo">Título</label>
        <input
          id="ant-titulo"
          v-model="titulo"
          type="text"
          required
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-cliente">Cliente (opcional)</label>
        <input
          id="ant-cliente"
          v-model="cliente"
          type="text"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
          autocomplete="off"
        />
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex cursor-pointer items-center gap-2 text-base font-medium text-slate-800">
          <input v-model="recordar" type="checkbox" class="size-5 rounded border-slate-300" />
          Recordar
        </label>
      </div>

      <div v-if="puedeMostrarFechaRecordar">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-fecha">
          Fecha en que recordar (opcional)
        </label>
        <input
          id="ant-fecha"
          v-model="fechaRecordar"
          type="datetime-local"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base md:max-w-md"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-marca">
          Asociar a marca (opcional)
        </label>
        <input
          id="ant-marca"
          v-model="marca"
          type="text"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base"
          autocomplete="off"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-producto">
          Asociar a producto (opcional)
        </label>
        <select
          id="ant-producto"
          v-model="productoId"
          class="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base bg-white"
          :disabled="loadingProductos"
        >
          <option value="">— Ninguno —</option>
          <option v-for="p in productos" :key="p.id" :value="String(p.id)">{{ p.nombre }}</option>
        </select>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-desc">Descripción</label>
        <textarea
          id="ant-desc"
          v-model="descripcion"
          rows="5"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
      </div>

      <button
        type="submit"
        class="min-h-12 rounded-lg bg-indigo-600 px-6 py-2 text-base font-semibold text-white disabled:opacity-50"
        :disabled="saving"
      >
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </form>
  </main>
</template>
