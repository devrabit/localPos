<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../../../services/api'
import { formatFecha } from '../formatDisplay'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const detalle = ref(null)

const comentarioTexto = ref('')
const enviandoComentario = ref(false)
const errorComentario = ref('')
const eliminando = ref(false)

const id = computed(() => route.params.id)

async function cargar() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get(`/anotaciones/${id.value}`)
    detalle.value = data
  } catch (err) {
    error.value =
      err?.response?.status === 404
        ? 'Anotación no encontrada'
        : err?.response?.data?.error ||
          (typeof err?.message === 'string' ? err.message : '') ||
          'Error al cargar'
    detalle.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cargar()
})

const comentariosOrdenados = computed(() => {
  const list = detalle.value?.comentarios
  if (!Array.isArray(list)) return []
  return [...list].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
})

async function agregarComentario() {
  errorComentario.value = ''
  const t = comentarioTexto.value.trim()
  if (!t) {
    errorComentario.value = 'Escribe un comentario'
    return
  }
  enviandoComentario.value = true
  try {
    const { data } = await api.post(`/anotaciones/${id.value}/comentarios`, { texto: t })
    detalle.value = data
    comentarioTexto.value = ''
  } catch (err) {
    errorComentario.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'No se pudo guardar el comentario'
  } finally {
    enviandoComentario.value = false
  }
}

async function eliminarAnotacion() {
  if (!confirm('¿Eliminar esta anotación? Esta acción no se puede deshacer.')) return
  eliminando.value = true
  error.value = ''
  try {
    await api.delete(`/anotaciones/${id.value}`)
    router.push({ name: 'anotaciones' })
  } catch (err) {
    error.value =
      err?.response?.data?.error ||
      (typeof err?.message === 'string' ? err.message : '') ||
      'No se pudo eliminar'
  } finally {
    eliminando.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-100 p-4 md:p-6">
    <header class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 md:text-3xl">Detalle de anotación</h1>
        <p class="text-sm text-slate-500">Información completa y comentarios</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <router-link
          to="/anotaciones"
          class="inline-flex min-h-12 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-base font-semibold text-slate-800 shadow-sm"
        >
          Volver a Anotaciones
        </router-link>
        <button
          v-if="detalle"
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg border border-rose-300 bg-white px-4 py-2 text-base font-semibold text-rose-800 shadow-sm disabled:opacity-50"
          :disabled="eliminando"
          @click="eliminarAnotacion"
        >
          {{ eliminando ? 'Eliminando...' : 'Eliminar anotación' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="mb-4 rounded-lg bg-rose-100 px-3 py-2 text-rose-800">{{ error }}</p>

    <p v-if="loading" class="rounded-lg bg-white p-6 text-center text-slate-600 shadow-sm">Cargando...</p>

    <template v-else-if="detalle">
      <section class="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <dl class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Título</dt>
            <dd class="text-lg font-semibold text-slate-900">{{ detalle.titulo }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</dt>
            <dd class="text-slate-800">{{ detalle.cliente || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de creación</dt>
            <dd class="text-slate-800">{{ formatFecha(detalle.fechaCreacion) }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Recordar</dt>
            <dd class="text-slate-800">{{ detalle.recordar ? 'Sí' : 'No' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha en que recordar</dt>
            <dd class="text-slate-800">
              {{
                detalle.recordar && detalle.fechaRecordar
                  ? formatFecha(detalle.fechaRecordar) || detalle.fechaRecordar
                  : '—'
              }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Marca</dt>
            <dd class="text-slate-800">{{ detalle.marca || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Producto</dt>
            <dd class="text-slate-800">
              {{ detalle.productoNombre || '—'
              }}<span v-if="detalle.productoId" class="text-slate-500"> (ID {{ detalle.productoId }})</span>
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</dt>
            <dd class="whitespace-pre-wrap text-slate-800">{{ detalle.descripcion || '—' }}</dd>
          </div>
        </dl>
      </section>

      <section class="rounded-xl bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold text-slate-900">Comentarios</h2>
        <ul v-if="comentariosOrdenados.length" class="mb-6 space-y-3">
          <li
            v-for="c in comentariosOrdenados"
            :key="c.id"
            class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p class="text-slate-900">{{ c.texto }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ formatFecha(c.fecha) }}</p>
          </li>
        </ul>
        <p v-else class="mb-6 text-slate-500">Sin comentarios aún.</p>

        <p v-if="errorComentario" class="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {{ errorComentario }}
        </p>
        <form class="space-y-3" @submit.prevent="agregarComentario">
          <label class="block text-sm font-medium text-slate-700" for="nuevo-com">Agregar comentario</label>
          <textarea
            id="nuevo-com"
            v-model="comentarioTexto"
            rows="3"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          />
          <button
            type="submit"
            class="min-h-12 rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
            :disabled="enviandoComentario"
          >
            {{ enviandoComentario ? 'Guardando...' : 'Publicar comentario' }}
          </button>
        </form>
      </section>
    </template>
  </main>
</template>
