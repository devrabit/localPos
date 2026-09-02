<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

const items = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')

const itemsFiltrados = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter((item) => {
    const nombre = item.nombre?.toLowerCase() || ''
    const id = String(item.productId)
    const vid = item.variationId != null ? String(item.variationId) : ''
    return nombre.includes(q) || id.includes(q) || vid.includes(q)
  })
})

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
    const { data } = await api.get('/productos/sin-sku')
    items.value = data.items || []
  } catch (err) {
    error.value = err?.response?.data?.error || err?.message || 'No se pudo cargar el listado'
    items.value = []
  } finally {
    loading.value = false
  }
}

function irAGenerar(item) {
  const query = { productId: String(item.productId) }
  if (item.variationId != null) query.variationId = String(item.variationId)
  router.push({ path: '/codigos-barras', query })
}

onMounted(cargar)
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
          <span v-if="!loading">{{ itemsFiltrados.length }}</span>
          <span v-else>…</span>
          de {{ items.length }} sin SKU
        </p>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          :disabled="loading"
          @click="cargar"
        >
          Actualizar
        </button>
      </div>

      <input
        v-model="search"
        type="search"
        placeholder="Buscar por nombre o ID"
        class="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
      />

      <p v-if="error" class="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>
      <p v-else-if="loading" class="py-8 text-center text-slate-500">Cargando productos…</p>
      <p v-else-if="items.length === 0" class="py-8 text-center text-emerald-700">
        Todos los productos y variaciones tienen SKU asignado.
      </p>
      <p v-else-if="itemsFiltrados.length === 0" class="py-8 text-center text-slate-500">
        Ningun resultado para esta busqueda.
      </p>

      <ul v-else class="divide-y divide-slate-100 rounded-lg border border-slate-200">
        <li
          v-for="item in itemsFiltrados"
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
    </section>
  </main>
</template>
