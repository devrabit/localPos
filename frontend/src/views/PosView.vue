<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import ProductList from '../components/ProductList.vue'
import ChatAsistentePanel from '../components/ChatAsistentePanel.vue'
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
import { PAYMENT_METHODS } from '../constants/paymentMethods'

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
const escaneoRemotoLoading = ref(false)
const selectedPaymentMethod = ref('')
const paymentError = ref('')
/** cerrado | abierto | minimizado */
const chatEstado = ref('cerrado')
const chatPanelRef = ref(null)
const chatSessionId = ref('')
const chatEnviando = ref(false)
let scanFeedbackTimer = null

function nuevoSessionId() {
  return `pos:web:${crypto.randomUUID()}`
}

function abrirChat() {
  if (chatEstado.value === 'cerrado') {
    chatSessionId.value = nuevoSessionId()
  }
  chatEstado.value = 'abierto'
  nextTick(() => chatPanelRef.value?.focus())
}

function minimizarChat() {
  chatEstado.value = 'minimizado'
}

function cerrarChat() {
  chatEstado.value = 'cerrado'
}

function onNuevaConsulta() {
  if (chatEnviando.value) return
  chatSessionId.value = nuevoSessionId()
  chatPanelRef.value?.reiniciar()
}

async function onChatEnviar({ texto }) {
  if (chatEnviando.value) return
  chatEnviando.value = true
  try {
    const { data } = await api.post('/asesoria', {
      question: texto,
      sessionId: chatSessionId.value,
    })
    chatPanelRef.value?.agregarAsistente({
      texto: data.answer,
      clientMessage: data.clientMessage ?? null,
      sources: data.sources ?? [],
      esError: false,
    })
  } catch (err) {
    chatPanelRef.value?.agregarAsistente({
      texto: err?.response?.data?.error || 'El asesor no responde. Intenta de nuevo.',
      clientMessage: null,
      sources: [],
      esError: true,
    })
  } finally {
    chatEnviando.value = false
  }
}

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

    escaneoRemotoLoading.value = true
    const { data } = await api.get('/productos/escaneo', { params: { q: raw } })
    escaneoRemotoLoading.value = false
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
    escaneoRemotoLoading.value = false
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
  if (!Object.values(PAYMENT_METHODS).includes(selectedPaymentMethod.value)) {
    paymentError.value = 'Debes seleccionar un metodo de pago'
    return
  }
  paymentError.value = ''
  await carritoStore.crearOrden(clientesStore.selectedCliente, selectedPaymentMethod.value)
  selectedPaymentMethod.value = ''
}

function onPaymentMethodSelected(value) {
  selectedPaymentMethod.value = value
  paymentError.value = ''
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
      <input
        v-model="searchInput"
        type="text"
        placeholder="Nombre o SKU padre; codigo de variacion: Enter si no aparece en la lista"
        data-no-barcode-scan
        class="mt-3 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
        @keydown.enter.prevent="onBusquedaEnter"
      />
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
    <p
      v-if="escaneoRemotoLoading"
      class="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-base font-medium text-sky-900"
      role="status"
    >
      Buscando producto por codigo...
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

    <div class="grid gap-4 xl:grid-cols-[1.7fr_1fr_1fr]">
      <ProductList
        :productos="productosStore.productosFiltrados"
        :loading="productosStore.loading"
        @add="carritoStore.agregarProducto"
        @pick-variable="variableProduct = $event"
      />
      <VariationPickerModal
        v-if="variableProduct"
        :product="variableProduct"
        @close="variableProduct = null"
        @confirm="onVariacionElegida"
      />
      <CartPanel
        :items="carritoStore.items"
        :total="carritoStore.total"
        :checkout-loading="carritoStore.creatingOrder"
        :payment-method="selectedPaymentMethod"
        :payment-error="paymentError"
        @inc="carritoStore.incrementar"
        @dec="carritoStore.decrementar"
        @remove="carritoStore.eliminar"
        @update:payment-method="onPaymentMethodSelected"
        @checkout="confirmarVenta"
      />
      <CustomerPanel
        ref="customerPanelRef"
        :clientes="clientesStore.clientes"
        :selected-cliente="clientesStore.selectedCliente"
        :loading="clientesStore.loading"
        :creating="clientesStore.creating"
        :error="clientesStore.error"
        @select="(cliente) => (clientesStore.selectedCliente = cliente)"
        @create="crearCliente"
      />
    </div>

    <!-- Chat en z-40: los modales (z-50) deben quedar por encima. -->
    <button
      v-show="chatEstado === 'cerrado'"
      type="button"
      data-no-barcode-scan
      class="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg"
      aria-label="Abrir chat"
      title="Abrir chat"
      @click="abrirChat"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- Montado tambien al minimizar: los mensajes viven en el componente. -->
    <ChatAsistentePanel
      v-if="chatEstado !== 'cerrado'"
      v-show="chatEstado === 'abierto'"
      ref="chatPanelRef"
      :enviando="chatEnviando"
      @enviar="onChatEnviar"
      @nueva-consulta="onNuevaConsulta"
      @minimizar="minimizarChat"
      @cerrar="cerrarChat"
    />

    <div
      v-show="chatEstado === 'minimizado'"
      data-no-barcode-scan
      class="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-white py-2 pl-3 pr-2 shadow-lg ring-1 ring-slate-200"
    >
      <button
        type="button"
        class="flex items-center gap-2 text-sm font-semibold text-slate-800"
        aria-label="Restaurar chat"
        @click="abrirChat"
      >
        <svg class="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>Asistente POS</span>
      </button>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700"
        aria-label="Cerrar chat"
        title="Cerrar"
        @click="cerrarChat"
      >
        <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
    </div>
  </main>
</template>
