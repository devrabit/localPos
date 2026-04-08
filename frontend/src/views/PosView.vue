<script setup>
import { onMounted, ref, watch } from 'vue'
import ProductList from '../components/ProductList.vue'
import VariationPickerModal from '../components/VariationPickerModal.vue'
import CartPanel from '../components/CartPanel.vue'
import CustomerPanel from '../components/CustomerPanel.vue'
import { useProductosStore } from '../stores/productos'
import { useCarritoStore } from '../stores/carrito'
import { useClientesStore } from '../stores/clientes'

const productosStore = useProductosStore()
const carritoStore = useCarritoStore()
const clientesStore = useClientesStore()

const debounceTimer = ref(null)
const searchInput = ref('')
const customerPanelRef = ref(null)
const variableProduct = ref(null)

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
  await carritoStore.crearOrden(clientesStore.selectedCliente)
}

async function crearCliente(payload) {
  const ok = await clientesStore.crearCliente(payload)
  if (ok) {
    customerPanelRef.value?.resetCreacionForm()
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
        placeholder="Buscar por nombre o SKU"
        class="mt-3 min-h-12 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
      />
    </header>

    <p v-if="productosStore.error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-700">
      {{ productosStore.error }}
    </p>
    <p v-if="carritoStore.orderError" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-700">
      {{ carritoStore.orderError }}
    </p>
    <p
      v-if="carritoStore.orderSuccess"
      class="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-emerald-700"
    >
      {{ carritoStore.orderSuccess }}
    </p>

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
        @inc="carritoStore.incrementar"
        @dec="carritoStore.decrementar"
        @remove="carritoStore.eliminar"
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
  </main>
</template>
