<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'

defineProps({
  productos: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['add', 'pick-variable'])

const imagenActiva = ref(null)
const imagenRota = reactive({})

function abrirImagen(producto) {
  imagenActiva.value = {
    url: producto.imagen || null,
    nombre: producto.nombre || 'Producto',
  }
}

function cerrarImagen() {
  imagenActiva.value = null
}

function marcarImagenRota(productId) {
  imagenRota[productId] = true
}

function mostrarThumb(producto) {
  return Boolean(producto.imagen) && !imagenRota[producto.id]
}

function onKeydown(e) {
  if (e.key === 'Escape' && imagenActiva.value) {
    cerrarImagen()
  }
}

function onPick(producto) {
  if (producto.tipo === 'variable') {
    emit('pick-variable', producto)
  } else {
    emit('add', producto)
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <h2 class="mb-3 text-xl font-semibold text-slate-900">Productos</h2>
    <p v-if="loading" class="mb-3 rounded-lg bg-slate-100 px-4 py-3 text-base text-slate-600">
      Cargando catalogo...
    </p>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="producto in productos"
        :key="producto.id"
        class="min-h-[3.5rem] rounded-lg border border-slate-200 p-4 text-left text-base transition hover:border-indigo-300"
        :class="producto.tipo === 'variable' ? 'border-amber-200 bg-amber-50/40' : ''"
      >
        <div
          class="relative mb-3 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100"
        >
          <template v-if="mostrarThumb(producto)">
            <img
              :src="producto.imagen"
              :alt="producto.nombre"
              loading="lazy"
              decoding="async"
              class="h-full w-full object-contain"
              @error="marcarImagenRota(producto.id)"
            />
            <button
              type="button"
              class="absolute bottom-1.5 right-1.5 flex size-9 items-center justify-center rounded-full bg-slate-900/75 text-white shadow-md transition hover:bg-slate-900 active:scale-95"
              :aria-label="`Ampliar imagen de ${producto.nombre}`"
              @click.stop="abrirImagen(producto)"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="5.5" />
                <path d="M15 15l5 5" />
                <path d="M10.5 8v5M8 10.5h5" />
              </svg>
            </button>
          </template>
          <p v-else class="px-2 text-center text-sm text-slate-500">Sin imagen</p>
        </div>

        <button
          type="button"
          class="w-full rounded-md text-left active:bg-indigo-100 hover:bg-indigo-50 -m-1 p-1"
          @click="onPick(producto)"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-base font-semibold text-slate-900">{{ producto.nombre }}</p>
            <span
              v-if="producto.tipo === 'variable'"
              class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900"
            >
              Variaciones
            </span>
          </div>
          <p class="text-sm text-slate-500">SKU: {{ producto.sku || 'N/A' }}</p>
          <p class="mt-1 text-lg font-bold text-indigo-700">
            <template v-if="producto.tipo === 'variable'">
              <span v-if="Number(producto.precio) > 0">
                Desde $ {{ Number(producto.precio).toFixed(2) }}
              </span>
              <span v-else class="text-base font-semibold text-slate-600"
                >Precio al elegir variacion</span
              >
            </template>
            <template v-else> $ {{ Number(producto.precio).toFixed(2) }} </template>
          </p>
          <p class="text-xs text-slate-500">
            <template v-if="producto.tipo === 'variable'">
              Variaciones se cargan al abrir (lazy)
            </template>
            <template v-else>
              Stock:
              {{ producto.stock === -1 ? 'Sin limite' : producto.stock }}
            </template>
          </p>
        </button>
      </article>
    </div>

    <Teleport to="body">
      <div
        v-if="imagenActiva"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Imagen del producto"
        @click.self="cerrarImagen"
      >
        <div class="relative w-full max-w-lg rounded-xl bg-white p-4 shadow-xl">
          <div class="mb-3 flex items-start justify-between gap-3">
            <p class="text-base font-semibold text-slate-900 line-clamp-2">
              {{ imagenActiva.nombre }}
            </p>
            <button
              type="button"
              class="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              @click="cerrarImagen"
            >
              Cerrar
            </button>
          </div>
          <div class="flex min-h-[12rem] items-center justify-center rounded-lg bg-slate-100 p-2">
            <img
              v-if="imagenActiva.url"
              :src="imagenActiva.url"
              :alt="imagenActiva.nombre"
              class="max-h-[70vh] w-full object-contain"
            />
            <p v-else class="text-base text-slate-600">Sin imagen</p>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
