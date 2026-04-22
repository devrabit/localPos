<script setup>
import { onMounted, ref, watch } from 'vue'
import ProductList from '../components/ProductList.vue'
import VariationPickerModal from '../components/VariationPickerModal.vue'
import CartPanel from '../components/CartPanel.vue'
import CustomerPanel from '../components/CustomerPanel.vue'
import { useProductosStore } from '../stores/productos'
import { useCarritoStore } from '../stores/carrito'
import { useClientesStore } from '../stores/clientes'
import { imprimirFactura } from '../utils/invoicePrint'
import { useBarcodeScanner, playScanBeep } from '../composables/useBarcodeScanner'
import { esCodigoEscaneable } from '../utils/scanCode'
import api from '../services/api'

const productosStore = useProductosStore()
const carritoStore = useCarritoStore()
const clientesStore = useClientesStore()

const debounceTimer = ref(null)
const searchInput = ref('')
const customerPanelRef = ref(null)
const variableProduct = ref(null)
const facturaLoading = ref(false)
const facturaError = ref('')
const scanFeedback = ref({ tipo: '', texto: '' })
const escaneoBusy = ref(false)
const escaneoApiLoading = ref(false)
let scanFeedbackTimer = null
const MODULE_ORDER_STORAGE_KEY = 'naripos:dashboard-module-order'
const DEFAULT_MODULE_ORDER = ['search', 'products', 'cart', 'customers']
const draggingModule = ref('')
const moduleLabels = {
  search: 'Buscador',
  products: 'Listado de productos',
  cart: 'Carrito',
  customers: 'Clientes',
}

function onModuleDragStart(event, moduleKey) {
  draggingModule.value = moduleKey
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', moduleKey)
}

function onModuleDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

function onModuleDrop(moduleKey) {
  const dragged = draggingModule.value
  if (!dragged || dragged === moduleKey) return
  const nextOrder = [...moduleOrder.value]
  const fromIndex = nextOrder.indexOf(dragged)
  const toIndex = nextOrder.indexOf(moduleKey)
  if (fromIndex === -1 || toIndex === -1) return
  nextOrder.splice(fromIndex, 1)
  nextOrder.splice(toIndex, 0, dragged)
  moduleOrder.value = nextOrder
  guardarOrdenModulos(nextOrder)
}

function onModuleDragEnd() {
  draggingModule.value = ''
}

function normalizarOrdenModulos(rawOrder) {
  if (!Array.isArray(rawOrder)) return [...DEFAULT_MODULE_ORDER]
  const validKeys = new Set(DEFAULT_MODULE_ORDER)
  const sanitizado = rawOrder.filter((key) => validKeys.has(key))
  for (const requiredKey of DEFAULT_MODULE_ORDER) {
    if (!sanitizado.includes(requiredKey)) sanitizado.push(requiredKey)
  }
  return sanitizado
}

function leerOrdenModulosGuardado() {
  if (typeof window === 'undefined') return [...DEFAULT_MODULE_ORDER]
  try {
    const saved = localStorage.getItem(MODULE_ORDER_STORAGE_KEY)
    if (!saved) return [...DEFAULT_MODULE_ORDER]
    const parsed = JSON.parse(saved)
    return normalizarOrdenModulos(parsed)
  } catch {
    return [...DEFAULT_MODULE_ORDER]
  }
}

function guardarOrdenModulos(order) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MODULE_ORDER_STORAGE_KEY, JSON.stringify(normalizarOrdenModulos(order)))
}

const moduleOrder = ref(leerOrdenModulosGuardado())

function setScanFeedback(tipo, texto) {
  if (scanFeedbackTimer) clearTimeout(scanFeedbackTimer)
  scanFeedback.value = { tipo, texto }
  scanFeedbackTimer = setTimeout(() => {
    scanFeedback.value = { tipo: '', texto: '' }
    scanFeedbackTimer = null
  }, 2800)
}

function desambiguarCoincidenciasEscaneo(locales, code) {
  if (locales.length <= 1) return locales
  const v = String(code || '').trim().toLowerCase()
  const exactParent = locales.filter((p) => (p.sku || '').trim().toLowerCase() === v)
  if (exactParent.length === 1) return exactParent
  return locales
}

/**
 * Lector: primero SKU exacto del padre en cache; si no, GET /productos/escaneo (Woo resuelve variaciones).
 */
function onBusquedaEnter() {
  const q = searchInput.value.trim()
  if (!q) return
  if (productosStore.coincidenciasBusqueda(q).length > 0) return
  if (!esCodigoEscaneable(q)) return
  procesarCodigoEscaneado(q)
}

async function procesarCodigoEscaneado(code) {
  if (escaneoBusy.value) return
  const raw = String(code || '').trim()
  if (!raw) return
  escaneoBusy.value = true
  try {
    let locales = productosStore.coincidenciasEscaneoLocales(raw)
    locales = desambiguarCoincidenciasEscaneo(locales, raw)

    if (locales.length === 1) {
      const p = locales[0]
      if (p.tipo === 'variable') {
        variableProduct.value = p
        playScanBeep()
        setScanFeedback('ok', `Elije variacion: ${p.nombre}`)
        return
      }
      if (p.stock === 0) {
        setScanFeedback('error', 'Producto sin stock')
        return
      }
      carritoStore.agregarProducto(p)
      playScanBeep()
      setScanFeedback('ok', `Agregado: ${p.nombre}`)
      return
    }

    if (locales.length > 1) {
      searchInput.value = raw
      productosStore.query = raw
      setScanFeedback('error', 'Varias coincidencias: elige en la lista')
      return
    }

    if (!esCodigoEscaneable(raw)) {
      setScanFeedback('error', 'Codigo vacio o invalido')
      return
    }

    escaneoApiLoading.value = true
    const { data } = await api.get('/productos/escaneo', { params: { q: raw } })
    if (data.sinStock) {
      setScanFeedback('error', 'Producto sin stock')
      return
    }
    if (data.resultado === 'simple') {
      carritoStore.agregarProducto(data.producto)
      playScanBeep()
      setScanFeedback('ok', `Agregado: ${data.producto.nombre}`)
      return
    }
    if (data.resultado === 'variacion' && data.variacion) {
      const v = data.variacion
      carritoStore.agregarVariacion({
        productId: v.productId,
        variationId: v.variationId,
        nombre: v.nombre,
        precio: v.precio,
        stock: v.stock,
      })
      playScanBeep()
      setScanFeedback('ok', `Agregado: ${v.nombre}`)
      return
    }
    if (data.resultado === 'variable_sin_elegir') {
      variableProduct.value = data.producto
      playScanBeep()
      setScanFeedback('ok', `Elije variacion: ${data.producto.nombre}`)
    }
  } catch (err) {
    const aborted =
      err?.code === 'ECONNABORTED' ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'))
    const msg = aborted
      ? 'La busqueda tardo demasiado (Woo lento). Reintenta en unos segundos.'
      : err?.response?.status === 404
        ? 'Codigo no encontrado'
        : err?.response?.data?.error || 'Error al buscar producto'
    setScanFeedback('error', msg)
  } finally {
    escaneoApiLoading.value = false
    escaneoBusy.value = false
  }
}

useBarcodeScanner({
  onDecoded: procesarCodigoEscaneado,
  isEnabled: () => !carritoStore.creatingOrder && !escaneoBusy.value,
})

function onVariacionElegida(payload) {
  carritoStore.agregarVariacion(payload)
  variableProduct.value = null
}

watch(
  searchInput,
  (value) => {
    if (debounceTimer.value) clearTimeout(debounceTimer.value)
    debounceTimer.value = setTimeout(() => {
      productosStore.query = value
    }, 250)
  },
)

onMounted(async () => {
  productosStore.hydrateCache()
  await Promise.all([productosStore.cargarProductos(), clientesStore.cargarClientes()])
})

async function confirmarVenta() {
  try {
    await carritoStore.crearOrden(clientesStore.selectedCliente)
  } catch {
    // El store ya expone el mensaje de error para la UI.
  }
}

async function crearCliente(payload) {
  const ok = await clientesStore.crearCliente(payload)
  if (ok) {
    customerPanelRef.value?.resetCreacionForm()
  }
}

async function imprimirFacturaUltimaVenta() {
  const f = carritoStore.lastFactura
  if (!f) return
  facturaLoading.value = true
  facturaError.value = ''
  try {
    await imprimirFactura(f)
  } catch (e) {
    facturaError.value = e?.message || 'No se pudo abrir la impresion'
  } finally {
    facturaLoading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 rounded-xl bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Nari POS</h1>
          <p class="text-sm text-slate-500">Punto de venta conectado a WooCommerce</p>
        </div>
        <router-link
          to="/codigos-barras"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Codigos de barras
        </router-link>
        <router-link
          to="/historial"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Historial de ventas
        </router-link>
      </div>
    </header>

    <p
      v-if="scanFeedback.texto"
      class="mb-4 rounded-lg px-3 py-2 text-base font-medium"
      :class="
        scanFeedback.tipo === 'ok'
          ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border border-rose-200 bg-rose-50 text-rose-900'
      "
      role="status"
    >
      {{ scanFeedback.texto }}
    </p>

    <p v-if="productosStore.error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-700">
      {{ productosStore.error }}
    </p>
    <p v-if="carritoStore.orderError" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-700">
      {{ carritoStore.orderError }}
    </p>
    <div
      v-if="carritoStore.orderSuccess"
      class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-900"
    >
      <p class="font-medium">{{ carritoStore.orderSuccess }}</p>
      <div v-if="carritoStore.lastFactura" class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="min-h-12 rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="facturaLoading"
          @click="imprimirFacturaUltimaVenta"
        >
          {{ facturaLoading ? 'Preparando…' : 'Imprimir factura' }}
        </button>
        <button
          type="button"
          class="min-h-12 rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-medium text-slate-700"
          :disabled="facturaLoading"
          @click="carritoStore.descartarUltimaFactura()"
        >
          Cerrar
        </button>
      </div>
      <p v-if="facturaError" class="mt-2 text-sm text-rose-700">{{ facturaError }}</p>
    </div>

    <div class="flex flex-col gap-4">
      <section
        v-if="moduleOrder[0]"
        :key="moduleOrder[0]"
        draggable="true"
        class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-transparent transition"
        :class="
          draggingModule === moduleOrder[0] ? 'cursor-grabbing opacity-80 ring-slate-300' : 'cursor-grab'
        "
        @dragstart="onModuleDragStart($event, moduleOrder[0])"
        @dragover="onModuleDragOver"
        @drop="onModuleDrop(moduleOrder[0])"
        @dragend="onModuleDragEnd"
      >
        <div class="mb-2 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <h2 class="text-sm font-semibold text-slate-700">↕ {{ moduleLabels[moduleOrder[0]] }}</h2>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 shadow-sm"
            aria-label="Arrastrar modulo"
            title="Arrastrar modulo"
          >
            <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="3" r="1.2" />
              <circle cx="11" cy="3" r="1.2" />
              <circle cx="5" cy="8" r="1.2" />
              <circle cx="11" cy="8" r="1.2" />
              <circle cx="5" cy="13" r="1.2" />
              <circle cx="11" cy="13" r="1.2" />
            </svg>
            <span>Arrastrar</span>
          </button>
        </div>

        <div v-if="moduleOrder[0] === 'search'">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Nombre o SKU padre; codigo de variacion: Enter si no aparece en la lista"
            data-no-barcode-scan
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
            @keydown.enter.prevent="onBusquedaEnter"
          />
          <p v-if="escaneoApiLoading" class="mt-2 text-sm font-medium text-slate-600" role="status">
            Buscando codigo...
          </p>
        </div>

        <ProductList
          v-else-if="moduleOrder[0] === 'products'"
          :productos="productosStore.productosFiltrados"
          :loading="productosStore.loading"
          @add="carritoStore.agregarProducto"
          @pick-variable="variableProduct = $event"
        />

        <CartPanel
          v-else-if="moduleOrder[0] === 'cart'"
          :items="carritoStore.items"
          :total="carritoStore.total"
          :checkout-loading="carritoStore.creatingOrder"
          :payment-method="carritoStore.paymentMethod"
          :cash-received-str="carritoStore.cashReceivedStr"
          :change-minor="carritoStore.changeMinorValue"
          :cash-received-parsed="carritoStore.cashReceivedParsed"
          :cash-ready-for-checkout="carritoStore.cashReadyForCheckout"
          @inc="carritoStore.incrementar"
          @dec="carritoStore.decrementar"
          @remove="carritoStore.eliminar"
          @checkout="confirmarVenta"
          @update:payment-method="carritoStore.setPaymentMethod"
          @update:cash-received-str="(v) => (carritoStore.cashReceivedStr = v)"
          @quick-cash="carritoStore.addQuickCash"
        />

        <CustomerPanel
          v-else
          ref="customerPanelRef"
          :clientes="clientesStore.clientes"
          :selected-cliente="clientesStore.selectedCliente"
          :loading="clientesStore.loading"
          :creating="clientesStore.creating"
          :error="clientesStore.error"
          @select="(cliente) => (clientesStore.selectedCliente = cliente)"
          @create="crearCliente"
        />
      </section>

      <div class="grid gap-4 xl:grid-cols-[1fr_2fr_1fr]">
        <section
          v-for="moduleKey in moduleOrder.slice(1)"
          :key="moduleKey"
          draggable="true"
          class="rounded-xl bg-white p-3 shadow-sm ring-1 ring-transparent transition"
          :class="draggingModule === moduleKey ? 'cursor-grabbing opacity-80 ring-slate-300' : 'cursor-grab'"
          @dragstart="onModuleDragStart($event, moduleKey)"
          @dragover="onModuleDragOver"
          @drop="onModuleDrop(moduleKey)"
          @dragend="onModuleDragEnd"
        >
          <div class="mb-2 flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <h2 class="text-sm font-semibold text-slate-700">↕ {{ moduleLabels[moduleKey] }}</h2>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 shadow-sm"
              aria-label="Arrastrar modulo"
              title="Arrastrar modulo"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="3" r="1.2" />
                <circle cx="11" cy="3" r="1.2" />
                <circle cx="5" cy="8" r="1.2" />
                <circle cx="11" cy="8" r="1.2" />
                <circle cx="5" cy="13" r="1.2" />
                <circle cx="11" cy="13" r="1.2" />
              </svg>
              <span>Arrastrar</span>
            </button>
          </div>

          <div v-if="moduleKey === 'search'">
            <input
              v-model="searchInput"
              type="text"
              placeholder="Nombre o SKU padre; codigo de variacion: Enter si no aparece en la lista"
              data-no-barcode-scan
              class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
              @keydown.enter.prevent="onBusquedaEnter"
            />
            <p v-if="escaneoApiLoading" class="mt-2 text-sm font-medium text-slate-600" role="status">
              Buscando codigo...
            </p>
          </div>

          <ProductList
            v-else-if="moduleKey === 'products'"
            :productos="productosStore.productosFiltrados"
            :loading="productosStore.loading"
            @add="carritoStore.agregarProducto"
            @pick-variable="variableProduct = $event"
          />

          <CartPanel
            v-else-if="moduleKey === 'cart'"
            :items="carritoStore.items"
            :total="carritoStore.total"
            :checkout-loading="carritoStore.creatingOrder"
            :payment-method="carritoStore.paymentMethod"
            :cash-received-str="carritoStore.cashReceivedStr"
            :change-minor="carritoStore.changeMinorValue"
            :cash-received-parsed="carritoStore.cashReceivedParsed"
            :cash-ready-for-checkout="carritoStore.cashReadyForCheckout"
            @inc="carritoStore.incrementar"
            @dec="carritoStore.decrementar"
            @remove="carritoStore.eliminar"
            @checkout="confirmarVenta"
            @update:payment-method="carritoStore.setPaymentMethod"
            @update:cash-received-str="(v) => (carritoStore.cashReceivedStr = v)"
            @quick-cash="carritoStore.addQuickCash"
          />

          <CustomerPanel
            v-else
            ref="customerPanelRef"
            :clientes="clientesStore.clientes"
            :selected-cliente="clientesStore.selectedCliente"
            :loading="clientesStore.loading"
            :creating="clientesStore.creating"
            :error="clientesStore.error"
            @select="(cliente) => (clientesStore.selectedCliente = cliente)"
            @create="crearCliente"
          />
        </section>
      </div>
    </div>

    <VariationPickerModal
      v-if="variableProduct"
      :product="variableProduct"
      @close="variableProduct = null"
      @confirm="onVariacionElegida"
    />
  </main>
</template>
