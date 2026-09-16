<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as pedidosService from '../services/pedidosService'
import { formatFechaPedido, etiquetaEstado } from '../pedidoEstados'
import { descargarPedidoPdf } from '../utils/pedidoPdf'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const pedidoGuardado = ref(null)

const pedidoId = ref('')
const fechaCreacion = ref('')
const estadoActual = ref('')

const dirigidoA = ref('')
const items = ref([])
const editIndex = ref(-1)

const nombreProducto = ref('')
const referencia = ref('')
const cantidad = ref(1)
const descripcion = ref('')

const editando = computed(() => editIndex.value >= 0)

function limpiarItemForm() {
  nombreProducto.value = ''
  referencia.value = ''
  cantidad.value = 1
  descripcion.value = ''
  editIndex.value = -1
}

function validarItemForm() {
  if (!nombreProducto.value.trim()) return 'Nombre del producto requerido'
  if (!referencia.value.trim()) return 'Referencia requerida'
  const qty = Number(cantidad.value)
  if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
    return 'Cantidad debe ser un entero >= 1'
  }
  return ''
}

function agregarOActualizarItem() {
  error.value = ''
  const msg = validarItemForm()
  if (msg) {
    error.value = msg
    return
  }
  const row = {
    nombreProducto: nombreProducto.value.trim(),
    referencia: referencia.value.trim(),
    cantidad: Number(cantidad.value),
    descripcion: descripcion.value.trim(),
  }
  if (editando.value) {
    items.value.splice(editIndex.value, 1, row)
  } else {
    items.value.push(row)
  }
  limpiarItemForm()
}

function editarItem(index) {
  const row = items.value[index]
  if (!row) return
  nombreProducto.value = row.nombreProducto
  referencia.value = row.referencia
  cantidad.value = row.cantidad
  descripcion.value = row.descripcion || ''
  editIndex.value = index
}

function eliminarItem(index) {
  items.value.splice(index, 1)
  if (editIndex.value === index) limpiarItemForm()
  else if (editIndex.value > index) editIndex.value -= 1
}

async function cargar() {
  loading.value = true
  error.value = ''
  pedidoGuardado.value = null
  try {
    const data = await pedidosService.getPedido(route.params.id)
    pedidoId.value = data.id
    fechaCreacion.value = data.fechaCreacion
    estadoActual.value = data.estado
    dirigidoA.value = data.dirigidoA || ''
    items.value = (Array.isArray(data.items) ? data.items : []).map((it) => ({
      nombreProducto: it.nombreProducto,
      referencia: it.referencia,
      cantidad: Number(it.cantidad) || 1,
      descripcion: it.descripcion || '',
    }))
    limpiarItemForm()
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error cargando pedido'
    pedidoId.value = ''
  } finally {
    loading.value = false
  }
}

async function guardarCambios() {
  error.value = ''
  if (!dirigidoA.value.trim()) {
    error.value = 'Dirigido a es obligatorio'
    return
  }
  if (!items.value.length) {
    error.value = 'Agrega al menos un producto'
    return
  }

  saving.value = true
  try {
    const updated = await pedidosService.updatePedido(pedidoId.value, {
      dirigidoA: dirigidoA.value.trim(),
      items: items.value.map((it) => ({ ...it })),
    })
    pedidoGuardado.value = updated
    fechaCreacion.value = updated.fechaCreacion
    estadoActual.value = updated.estado
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'Error guardando cambios'
  } finally {
    saving.value = false
  }
}

async function onDescargarPdf() {
  if (!pedidoGuardado.value) return
  try {
    await descargarPedidoPdf(pedidoGuardado.value)
  } catch (err) {
    error.value = err?.message || 'No se pudo abrir el PDF'
  }
}

function cancelar() {
  if (pedidoId.value) {
    router.push({ name: 'pedidos-detalle', params: { id: pedidoId.value } })
  } else {
    router.push({ name: 'pedidos' })
  }
}

onMounted(() => {
  cargar()
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Editar pedido</h1>
        <p class="text-sm text-slate-500">Solo MySQL — el estado no se modifica aqui</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
          @click="cancelar"
        >
          Cancelar
        </button>
        <router-link
          to="/pedidos"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Listado
        </router-link>
      </div>
    </header>

    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>
    <p v-if="loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando...
    </p>

    <div
      v-else-if="pedidoGuardado"
      class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-sm"
    >
      <p class="text-base font-semibold">Pedido actualizado correctamente.</p>
      <p class="mt-1 text-sm">ID: {{ pedidoGuardado.id }}</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
          @click="onDescargarPdf"
        >
          Descargar PDF
        </button>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-emerald-300 bg-white px-4 py-2 text-base font-semibold text-emerald-900"
          @click="router.push({ name: 'pedidos-detalle', params: { id: pedidoGuardado.id } })"
        >
          Ver detalle
        </button>
      </div>
    </div>

    <section v-else-if="pedidoId" class="space-y-4">
      <div class="rounded-xl bg-white p-4 shadow-sm">
        <p class="text-sm text-slate-500">ID</p>
        <p class="font-mono text-sm text-slate-800">{{ pedidoId }}</p>
        <p class="mt-3 text-sm text-slate-500">Fecha</p>
        <p class="text-base text-slate-900">{{ formatFechaPedido(fechaCreacion) }}</p>
        <p class="mt-3 text-sm text-slate-500">Estado (solo lectura)</p>
        <p class="text-base text-slate-900">{{ etiquetaEstado(estadoActual) }}</p>
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm">
        <label class="mb-1 block text-sm font-medium text-slate-700" for="dirigido-a-edit">
          Dirigido a
        </label>
        <input
          id="dirigido-a-edit"
          v-model="dirigidoA"
          type="text"
          class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
          placeholder="Proveedor o destinatario"
        />
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-slate-900">
          {{ editando ? 'Editar producto' : 'Agregar producto' }}
        </h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="nombre-producto-edit">
              Nombre del producto
            </label>
            <input
              id="nombre-producto-edit"
              v-model="nombreProducto"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="referencia-edit">
              Referencia
            </label>
            <input
              id="referencia-edit"
              v-model="referencia"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="cantidad-edit">
              Cantidad
            </label>
            <input
              id="cantidad-edit"
              v-model.number="cantidad"
              type="number"
              min="1"
              step="1"
              class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="descripcion-edit">
              Descripcion (opcional)
            </label>
            <input
              id="descripcion-edit"
              v-model="descripcion"
              type="text"
              class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            />
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white"
            @click="agregarOActualizarItem"
          >
            {{ editando ? 'Actualizar producto' : 'Agregar a la lista' }}
          </button>
          <button
            v-if="editando"
            type="button"
            class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 px-4 py-2 text-base font-semibold text-slate-800"
            @click="limpiarItemForm"
          >
            Cancelar edicion
          </button>
        </div>
      </div>

      <div class="rounded-xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-slate-900">Productos del pedido</h2>
        <div
          v-if="!items.length"
          class="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500"
        >
          Sin productos. Agrega al menos uno.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-3 py-2 font-semibold">Producto</th>
                <th class="px-3 py-2 font-semibold">Referencia</th>
                <th class="px-3 py-2 font-semibold">Cant.</th>
                <th class="px-3 py-2 font-semibold">Descripcion</th>
                <th class="px-3 py-2 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="(it, index) in items" :key="`${it.referencia}-${index}`">
                <td class="px-3 py-2 font-medium text-slate-900">{{ it.nombreProducto }}</td>
                <td class="px-3 py-2 text-slate-700">{{ it.referencia }}</td>
                <td class="px-3 py-2 text-slate-700">{{ it.cantidad }}</td>
                <td class="px-3 py-2 text-slate-600">{{ it.descripcion || '—' }}</td>
                <td class="px-3 py-2">
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold"
                      @click="editarItem(index)"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      class="rounded-lg border border-rose-200 px-2 py-1 text-sm font-semibold text-rose-700"
                      @click="eliminarItem(index)"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
          :disabled="saving"
          @click="guardarCambios"
        >
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800"
          :disabled="saving"
          @click="cancelar"
        >
          Cancelar
        </button>
      </div>
    </section>
  </main>
</template>
