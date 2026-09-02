<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const items = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')

const page = ref(1)
const limit = ref(20)
const totalPages = ref(1)
const totalProductos = ref(0)
const hasMore = ref(false)

const LIMIT_OPTIONS = [20, 50, 100]

let searchTimer = null

function tipoLabel(tipo) {
  if (tipo === 'variacion') return 'Variacion'
  if (tipo === 'variable') return 'Variable (padre)'
  return 'Simple'
}

function tipoBadgeClass(tipo) {
  if (tipo === 'variacion') return 'bg-violet-100 text-violet-800'
  if (tipo === 'variable') return 'bg-amber-100 text-amber-900'
  return 'bg-sky-100 text-sky-800'
}

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/productos/sin-sku', {
      params: { page: page.value, limit: limit.value, q: search.value.trim() },
    })
    items.value = data.items || []
    page.value = data.page || 1
    totalPages.value = data.totalPages || 1
    totalProductos.value = data.totalProductos || 0
    hasMore.value = Boolean(data.hasMore)
  } catch (err) {
    const status = err?.response?.status
    if (status === 504 || err?.code === 'ECONNABORTED') {
      error.value =
        'El catalogo tarda demasiado en responder. Reintenta o reduce los productos por pagina.'
    } else {
      error.value = err?.response?.data?.error || err?.message || 'No se pudo cargar el listado'
    }
    items.value = []
  } finally {
    loading.value = false
  }
}

function irAPagina(destino) {
  const siguiente = Math.min(Math.max(1, destino), totalPages.value)
  if (siguiente === page.value) return
  page.value = siguiente
  cargar()
}

function cambiarLimite(valor) {
  limit.value = Number(valor)
  page.value = 1
  cargar()
}

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    cargar()
  }, 350)
})

function irAGenerar(item) {
  const query = { productId: String(item.productId) }
  if (item.variationId != null) query.variationId = String(item.variationId)
  router.push({ path: '/codigos-barras', query })
}

onMounted(cargar)

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Productos sin SKU</h1>
        <p class="text-sm text-slate-500">
          Productos simples, variables y variaciones que aun no tienen codigo asignado
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/codigos-barras"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white"
        >
          Volver a codigos
        </router-link>
        <router-link
          to="/"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          POS
        </router-link>
      </div>
    </header>

    <section class="rounded-xl bg-white p-4 shadow-sm">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-slate-600">
          <span v-if="loading">Cargando…</span>
          <span v-else>
            {{ items.length }} sin SKU en esta pagina · Pagina {{ page }} de {{ totalPages }} ({{
              totalProductos
            }}
            productos)
          </span>
        </p>
        <div class="flex flex-wrap items-center gap-2">
          <label class="text-sm text-slate-600">
            Por pagina
            <select
              :value="limit"
              class="ml-1 rounded-lg border border-slate-300 px-2 py-1 text-sm"
              :disabled="loading"
              @change="cambiarLimite($event.target.value)"
            >
              <option v-for="opt in LIMIT_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </label>
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            :disabled="loading"
            @click="cargar"
          >
            Actualizar
          </button>
        </div>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="Buscar por nombre, SKU o ID de producto"
        class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
      />

      <p v-if="error" class="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>
      <p v-else-if="loading" class="py-8 text-center text-slate-500">Cargando productos…</p>
      <p v-else-if="totalProductos === 0" class="py-8 text-center text-slate-500">
        Ningun producto coincide con la busqueda.
      </p>
      <p v-else-if="items.length === 0" class="py-8 text-center text-emerald-700">
        Todos los productos de esta pagina tienen SKU. Avanza a la siguiente pagina para seguir revisando.
      </p>

      <ul v-else class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        <li
          v-for="item in items"
          :key="`${item.productId}-${item.variationId ?? 'p'}`"
          class="flex flex-wrap items-center justify-between gap-3 px-3 py-3 hover:bg-slate-50"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-slate-900">{{ item.nombre }}</p>
            <p class="text-sm text-slate-500">
              Producto #{{ item.productId }}
              <template v-if="item.variationId"> · Variacion #{{ item.variationId }}</template>
              · Precio: {{ item.precio.toFixed(2) }}
            </p>
          </div>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="tipoBadgeClass(item.tipo)"
          >
            {{ tipoLabel(item.tipo) }}
          </span>
          <button
            type="button"
            class="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            @click="irAGenerar(item)"
          >
            Generar codigo
          </button>
        </li>
      </ul>

      <nav v-if="!error && totalProductos > 0" class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="loading || page <= 1"
          @click="irAPagina(page - 1)"
        >
          Anterior
        </button>
        <span class="text-sm text-slate-600">Pagina {{ page }} de {{ totalPages }}</span>
        <button
          type="button"
          class="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="loading || !hasMore"
          @click="irAPagina(page + 1)"
        >
          Siguiente
        </button>
      </nav>
    </section>
  </main>
</template>
