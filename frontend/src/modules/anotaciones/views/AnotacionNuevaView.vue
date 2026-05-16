<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '../../../services/api'
import { useClientesStore } from '../../../stores/clientes'

const clientesStore = useClientesStore()

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

const panelBusquedaClienteAbierto = ref(false)
const buscandoCliente = ref(false)

const panelBusquedaMarcaAbierto = ref(false)
const resultadoMarcas = ref([])
const buscandoMarca = ref(false)
const errorMarcaBusqueda = ref('')

const mostrarBotonBuscarCliente = computed(() => cliente.value.trim().length > 0)
const mostrarBotonBuscarMarca = computed(() => marca.value.trim().length > 0)

const coincidenciasCliente = computed(() => {
  const q = cliente.value.trim().toLowerCase()
  if (!q) return []
  return clientesStore.clientes.filter((c) => {
    const nombre = (c.nombre || '').toLowerCase()
    const tel = String(c.telefono || '')
    return nombre.includes(q) || tel.includes(cliente.value.trim())
  })
})

async function abrirBusquedaCliente() {
  panelBusquedaClienteAbierto.value = true
  if (!clientesStore.clientes.length && !clientesStore.loading) {
    buscandoCliente.value = true
    try {
      await clientesStore.cargarClientes()
    } finally {
      buscandoCliente.value = false
    }
  }
}

function cerrarPanelCliente() {
  panelBusquedaClienteAbierto.value = false
}

function elegirCliente(c) {
  cliente.value = (c.nombre || '').trim()
  cerrarPanelCliente()
}

function onClienteBlur(e) {
  const next = e.relatedTarget
  if (next && typeof next.closest === 'function' && next.closest('[data-cliente-busqueda]')) {
    return
  }
  setTimeout(() => cerrarPanelCliente(), 150)
}

async function abrirBusquedaMarca() {
  const q = marca.value.trim()
  if (!q) return
  panelBusquedaMarcaAbierto.value = true
  errorMarcaBusqueda.value = ''
  resultadoMarcas.value = []
  buscandoMarca.value = true
  try {
    const { data } = await api.get('/marcas', { params: { q } })
    resultadoMarcas.value = Array.isArray(data.marcas) ? data.marcas : []
  } catch (err) {
    errorMarcaBusqueda.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error al buscar marcas'
    resultadoMarcas.value = []
  } finally {
    buscandoMarca.value = false
  }
}

function cerrarPanelMarca() {
  panelBusquedaMarcaAbierto.value = false
}

function elegirMarcaEtiqueta(label) {
  marca.value = label
  cerrarPanelMarca()
}

function onMarcaBlur(e) {
  const next = e.relatedTarget
  if (next && typeof next.closest === 'function' && next.closest('[data-marca-busqueda]')) {
    return
  }
  setTimeout(() => cerrarPanelMarca(), 150)
}

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

onMounted(() => {
  cargarProductos()
})
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

      <div class="relative" data-cliente-busqueda>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-cliente">Cliente (opcional)</label>
        <div class="flex gap-2">
          <input
            id="ant-cliente"
            v-model="cliente"
            type="text"
            class="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-base"
            autocomplete="off"
            @blur="onClienteBlur"
          />
          <button
            v-if="mostrarBotonBuscarCliente"
            type="button"
            class="inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            title="Buscar cliente"
            aria-label="Buscar cliente"
            data-cliente-busqueda
            @click="abrirBusquedaCliente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>
        <div
          v-if="panelBusquedaClienteAbierto && mostrarBotonBuscarCliente"
          class="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          data-cliente-busqueda
          role="listbox"
        >
          <p v-if="buscandoCliente || clientesStore.loading" class="px-3 py-2 text-sm text-slate-500">Cargando clientes...</p>
          <p v-else-if="clientesStore.error" class="px-3 py-2 text-sm text-rose-600">{{ clientesStore.error }}</p>
          <p v-else-if="!coincidenciasCliente.length" class="px-3 py-2 text-sm text-slate-500">Sin coincidencias</p>
          <button
            v-for="c in coincidenciasCliente"
            :key="c.id"
            type="button"
            class="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
            role="option"
            @mousedown.prevent="elegirCliente(c)"
          >
            <span class="font-medium text-slate-900">{{ c.nombre }}</span>
            <span v-if="c.telefono" class="text-xs text-slate-500">{{ c.telefono }}</span>
          </button>
        </div>
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

      <div class="relative" data-marca-busqueda>
        <label class="mb-1 block text-sm font-medium text-slate-700" for="ant-marca">
          Asociar a marca (opcional)
        </label>
        <div class="flex gap-2">
          <input
            id="ant-marca"
            v-model="marca"
            type="text"
            class="min-h-12 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-base"
            autocomplete="off"
            @blur="onMarcaBlur"
          />
          <button
            v-if="mostrarBotonBuscarMarca"
            type="button"
            class="inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            title="Buscar marca"
            aria-label="Buscar marca"
            data-marca-busqueda
            @click="abrirBusquedaMarca"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="size-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </button>
        </div>
        <div
          v-if="panelBusquedaMarcaAbierto && mostrarBotonBuscarMarca"
          class="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          data-marca-busqueda
          role="listbox"
        >
          <p v-if="buscandoMarca" class="px-3 py-2 text-sm text-slate-500">Buscando marcas...</p>
          <p v-else-if="errorMarcaBusqueda" class="px-3 py-2 text-sm text-rose-600">{{ errorMarcaBusqueda }}</p>
          <p v-else-if="!resultadoMarcas.length" class="px-3 py-2 text-sm text-slate-500">Sin coincidencias</p>
          <button
            v-for="m in resultadoMarcas"
            :key="m"
            type="button"
            class="flex w-full px-3 py-2 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
            role="option"
            @mousedown.prevent="elegirMarcaEtiqueta(m)"
          >
            {{ m }}
          </button>
        </div>
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
