<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import api from '../services/api'
import { useProductosStore } from '../stores/productos'

const productosStore = useProductosStore()

const searchProduct = ref('')
const texto = ref('SC-000123')
const tipo = ref('CODE128')
const mostrarTexto = ref(true)
const margen = ref(8)
const escala = ref(3)
const alturaBarras = ref(12)

const previewSvg = ref(null)
const serverImage = ref('')
const serverId = ref('')
const loading = ref(false)
const error = ref('')
const syncMsg = ref('')

const modalAbierto = ref(false)
const copias = ref(1)
const etiqueta = ref('50x30')
const gridLayout = ref('1x1')

const productoSeleccionado = ref(null)

const etiquetasPresets = {
  '50x30': { w: '50mm', h: '30mm' },
  '80x40': { w: '80mm', h: '40mm' },
}

const labelStyle = computed(() => {
  const { w, h } = etiquetasPresets[etiqueta.value] || etiquetasPresets['50x30']
  return { width: w, minHeight: h, boxSizing: 'border-box' }
})

const gridTemplate = computed(() => {
  const { w } = etiquetasPresets[etiqueta.value] || etiquetasPresets['50x30']
  return { gridTemplateColumns: `repeat(${gridCols.value}, ${w})` }
})

const gridCols = computed(() => {
  if (gridLayout.value === '2x2') return 2
  if (gridLayout.value === '3x3') return 3
  return 1
})

const printSrc = computed(() => serverImage.value || '')

const celdasImpresion = computed(() => {
  const n = Math.min(500, Math.max(1, Number(copias.value) || 1))
  return Array.from({ length: n }, (_, i) => i)
})

function dibujarVistaPrevia() {
  const el = previewSvg.value
  if (!el) return
  const raw = String(texto.value || '').trim()
  if (!raw) {
    el.innerHTML = ''
    return
  }
  try {
    const fmt = tipo.value === 'EAN13' ? 'EAN13' : 'CODE128'
    el.innerHTML = ''
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    el.appendChild(svg)
    JsBarcode(svg, raw, {
      format: fmt,
      displayValue: mostrarTexto.value,
      margin: margen.value,
      width: Math.max(1, Math.min(6, escala.value)),
      height: Math.max(20, alturaBarras.value * 3),
    })
  } catch {
    el.innerHTML = ''
  }
}

watch(
  [texto, tipo, mostrarTexto, margen, escala, alturaBarras],
  () => {
    nextTick(dibujarVistaPrevia)
  },
  { immediate: true },
)

watch(previewSvg, () => nextTick(dibujarVistaPrevia))

onMounted(async () => {
  productosStore.hydrateCache()
  await productosStore.cargarProductos()
})

function elegirProducto(p) {
  productoSeleccionado.value = p
  const base = (p.sku && String(p.sku).trim()) || String(p.id)
  texto.value = base
  searchProduct.value = ''
}

async function generarEnServidor() {
  error.value = ''
  syncMsg.value = ''
  loading.value = true
  try {
    const body = {
      text: texto.value,
      type: tipo.value,
      scale: escala.value,
      height: alturaBarras.value,
      includetext: mostrarTexto.value,
    }
    if (productoSeleccionado.value) {
      body.product_id = productoSeleccionado.value.id
      body.sku = productoSeleccionado.value.sku || ''
    }
    const { data } = await api.post('/barcode/generate', body)
    serverImage.value = data.image
    serverId.value = data.id
  } catch (err) {
    serverImage.value = ''
    serverId.value = ''
    error.value = err?.response?.data?.error || err?.message || 'Error al generar'
  } finally {
    loading.value = false
  }
}

async function registrarImpresion() {
  if (!serverId.value) return
  try {
    await api.post('/barcode/print', {
      barcode_id: serverId.value,
      copies: copias.value,
      printer: 'default',
    })
  } catch {
    /* opcional */
  }
}

async function guardarEnWoo() {
  if (!productoSeleccionado.value?.id || !texto.value.trim()) {
    syncMsg.value = 'Selecciona un producto y un codigo valido.'
    return
  }
  syncMsg.value = ''
  loading.value = true
  try {
    await api.post('/barcode/sync-product', {
      productId: productoSeleccionado.value.id,
      barcode: texto.value,
      type: tipo.value,
    })
    syncMsg.value = 'SKU actualizado en WooCommerce con el numero del codigo.'
    await productosStore.cargarProductos()
    const actualizado = productosStore.productos.find((p) => p.id === productoSeleccionado.value.id)
    if (actualizado) {
      productoSeleccionado.value = actualizado
    }
  } catch (err) {
    syncMsg.value = err?.response?.data?.error || err?.message || 'No se pudo guardar en Woo.'
  } finally {
    loading.value = false
  }
}

async function imprimir() {
  await registrarImpresion()
  await nextTick()
  window.print()
}

async function abrirModal() {
  if (!printSrc.value) {
    await generarEnServidor()
  }
  if (!printSrc.value) {
    error.value = 'No se pudo generar el codigo para imprimir.'
    return
  }
  error.value = ''
  modalAbierto.value = true
}

const productosFiltradosBusqueda = computed(() => {
  const q = searchProduct.value.trim().toLowerCase()
  const list = productosStore.productos || []
  if (!q) return list.slice(0, 12)
  return list
    .filter((p) => {
      const nombre = p.nombre?.toLowerCase() || ''
      const sku = p.sku?.toLowerCase() || ''
      return nombre.includes(q) || sku.includes(q)
    })
    .slice(0, 20)
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6 print:hidden">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Codigos de barras</h1>
        <p class="text-sm text-slate-500">CODE128 y EAN13 — vista previa, generacion en servidor e impresion</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Volver al POS
        </router-link>
        <router-link
          to="/historial"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Historial
        </router-link>
      </div>
    </header>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-slate-900">Producto</h2>
        <input
          v-model="searchProduct"
          type="search"
          placeholder="Buscar por nombre o SKU"
          class="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
        <ul class="max-h-48 overflow-auto rounded-lg border border-slate-200">
          <li
            v-for="p in productosFiltradosBusqueda"
            :key="p.id"
            class="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
            @click="elegirProducto(p)"
          >
            <span class="font-medium text-slate-900">{{ p.nombre }}</span>
            <span class="ml-2 text-slate-500">SKU: {{ p.sku || '—' }} · #{{ p.id }}</span>
          </li>
        </ul>
        <p v-if="productoSeleccionado" class="mt-2 text-sm text-indigo-700">
          Seleccionado: {{ productoSeleccionado.nombre }} ({{ productoSeleccionado.sku || 'sin SKU' }})
        </p>
      </section>

      <section class="rounded-xl bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-lg font-semibold text-slate-900">Codigo</h2>
        <label class="mb-2 block text-sm text-slate-600">Texto / SKU / ID</label>
        <input
          v-model="texto"
          type="text"
          class="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
        />
        <label class="mb-1 block text-sm text-slate-600">Tipo</label>
        <select v-model="tipo" class="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-base">
          <option value="CODE128">CODE128</option>
          <option value="EAN13">EAN13</option>
        </select>
        <div class="grid grid-cols-2 gap-3">
          <label class="text-sm text-slate-600">
            Escala (servidor)
            <input v-model.number="escala" type="number" min="1" max="12" class="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label class="text-sm text-slate-600">
            Altura barras
            <input v-model.number="alturaBarras" type="number" min="5" max="40" class="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label class="text-sm text-slate-600">
            Margen (preview)
            <input v-model.number="margen" type="number" min="0" max="30" class="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label class="flex items-end gap-2 pb-1 text-sm text-slate-600">
            <input v-model="mostrarTexto" type="checkbox" class="h-5 w-5 rounded" />
            Mostrar texto
          </label>
        </div>
      </section>
    </div>

    <section class="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-slate-900">Vista previa (tiempo real)</h2>
      <div ref="previewSvg" class="min-h-[120px] rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4" />
    </section>

    <section class="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-lg font-semibold text-slate-900">Servidor e impresion</h2>
      <p v-if="error" class="mb-2 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>
      <p v-if="syncMsg" class="mb-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">{{ syncMsg }}</p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 shadow-sm"
          :disabled="!productoSeleccionado"
          @click="guardarEnWoo"
        >
          Guardar numero en SKU (Woo)
        </button>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 shadow-sm"
          @click="abrirModal"
        >
          Imprimir etiquetas
        </button>
      </div>
      <div v-if="serverImage" class="mt-4">
        <p class="mb-2 text-sm text-slate-600">PNG del servidor (ID: {{ serverId }})</p>
        <img :src="serverImage" alt="Codigo generado" class="max-h-48 rounded border border-slate-200 bg-white p-2" />
      </div>
    </section>

    <div
      v-if="modalAbierto"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-4 shadow-xl">
        <h3 class="mb-3 text-lg font-semibold">Impresion</h3>
        <label class="mb-2 block text-sm text-slate-600">Copias (lote)</label>
        <input v-model.number="copias" type="number" min="1" max="500" class="mb-3 w-full rounded border px-3 py-2" />
        <label class="mb-2 block text-sm text-slate-600">Tamano etiqueta</label>
        <select v-model="etiqueta" class="mb-3 w-full rounded border px-3 py-2">
          <option value="50x30">50 × 30 mm</option>
          <option value="80x40">80 × 40 mm</option>
        </select>
        <label class="mb-2 block text-sm text-slate-600">Layout</label>
        <select v-model="gridLayout" class="mb-4 w-full rounded border px-3 py-2">
          <option value="1x1">1 columna</option>
          <option value="2x2">2 columnas</option>
          <option value="3x3">3 columnas</option>
        </select>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg border px-4 py-2 font-medium" @click="modalAbierto = false">Cancelar</button>
          <button type="button" class="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white" @click="modalAbierto = false; imprimir()">
            Imprimir
          </button>
        </div>
      </div>
    </div>
  </main>

  <div class="print-only hidden print:block">
    <div class="grid justify-start gap-0 p-0" :style="gridTemplate">
      <div
        v-for="i in celdasImpresion"
        :key="i"
        class="flex items-center justify-center bg-white"
        :style="labelStyle"
      >
        <img v-if="printSrc" :src="printSrc" alt="" class="max-h-full max-w-full object-contain" />
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    margin: 0;
  }

  body {
    margin: 0 !important;
    padding: 0 !important;
  }

  body * {
    visibility: hidden;
  }

  .print-only,
  .print-only * {
    visibility: visible;
  }

  .print-only {
    position: absolute;
    inset: 0;
    display: block !important;
  }
}
</style>
