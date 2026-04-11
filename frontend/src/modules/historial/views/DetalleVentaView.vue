<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ResumenVenta from '../components/ResumenVenta.vue'
import { useHistorialStore } from '../store/historialStore'
import { useCarritoStore } from '../../../stores/carrito'
import { detalleHistorialToFactura, imprimirFactura } from '../../../utils/invoicePrint'

const route = useRoute()
const router = useRouter()
const historial = useHistorialStore()
const carrito = useCarritoStore()

const facturaLoading = ref(false)
const facturaError = ref('')

function cargar() {
  const id = route.params.id
  if (id) historial.fetchDetalle(Number(id))
}

onMounted(cargar)
watch(() => route.params.id, cargar)

function rearmarCarrito() {
  const d = historial.detalle
  if (!d?.items?.length) return
  for (const item of d.items) {
    carrito.agregarLinea(
      {
        id: item.productId,
        variationId: item.variationId,
        nombre: item.nombre,
        precio: item.precio,
        maxStock: -1,
      },
      item.cantidad,
    )
  }
  router.push({ name: 'pos' })
}

async function imprimirFacturaPedido() {
  const d = historial.detalle
  if (!d) return
  facturaLoading.value = true
  facturaError.value = ''
  try {
    await imprimirFactura(detalleHistorialToFactura(d))
  } catch (e) {
    facturaError.value = e?.message || 'No se pudo imprimir'
  } finally {
    facturaLoading.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Pedido #{{ route.params.id }}</h1>
        <p class="text-sm text-slate-500">Detalle de la venta</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-if="historial.detalle?.items?.length"
          type="button"
          class="min-h-12 rounded-lg bg-slate-900 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
          :disabled="facturaLoading"
          @click="imprimirFacturaPedido"
        >
          {{ facturaLoading ? 'Preparando…' : 'Imprimir factura' }}
        </button>
        <button
          v-if="historial.detalle?.items?.length"
          type="button"
          class="min-h-12 rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
          @click="rearmarCarrito"
        >
          Poner en carrito
        </button>
        <router-link
          to="/historial"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 px-4 py-2 text-base font-medium text-slate-800"
        >
          Volver al historial
        </router-link>
      </div>
    </header>

    <p v-if="historial.error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ historial.error }}
    </p>
    <p v-if="facturaError" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">
      {{ facturaError }}
    </p>

    <p v-if="historial.loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">
      Cargando pedido...
    </p>

    <ResumenVenta v-else-if="historial.detalle" :detalle="historial.detalle" />
  </main>
</template>
