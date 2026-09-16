<script setup>
import { nextTick, onMounted, ref } from 'vue'

const props = defineProps({
  titulo: {
    type: String,
    default: 'Asistente POS',
  },
  mensajeBienvenida: {
    type: String,
    default: 'Hola, soy el asistente del POS. Escribe tu consulta.',
  },
  /** Reservado: mostrara "escribiendo..." cuando exista la conexion al APIAIGateway. */
  enviando: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['enviar', 'cerrar', 'minimizar'])

const MAX_CARACTERES = 1000

function horaActual() {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

let contadorId = 0
function nuevoId() {
  contadorId += 1
  return `msg-${contadorId}`
}

const mensajes = ref([
  { id: nuevoId(), autor: 'asistente', texto: props.mensajeBienvenida, hora: horaActual() },
])
const borrador = ref('')
const inputRef = ref(null)
const listaRef = ref(null)

async function scrollAlFinal() {
  await nextTick()
  const el = listaRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function enviar() {
  const texto = borrador.value.trim()
  if (!texto || texto.length > MAX_CARACTERES) return
  mensajes.value.push({ id: nuevoId(), autor: 'vendedor', texto, hora: horaActual() })
  borrador.value = ''
  emit('enviar', { texto })
  scrollAlFinal()
}

function onKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  enviar()
}

function focus() {
  inputRef.value?.focus()
}

onMounted(focus)

defineExpose({ focus })
</script>

<template>
  <!-- data-no-barcode-scan: sin esto, escribir aqui alimenta el buffer del lector USB. -->
  <section
    data-no-barcode-scan
    role="dialog"
    :aria-label="titulo"
    class="fixed inset-x-4 bottom-4 z-40 flex h-[80vh] flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200 sm:inset-x-auto sm:right-4 sm:top-4 sm:h-auto sm:w-96"
    @keydown.esc="emit('cerrar')"
  >
    <header class="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
      <div class="flex items-center gap-2">
        <svg class="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <h2 class="text-base font-semibold text-slate-900">{{ titulo }}</h2>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm"
          aria-label="Minimizar chat"
          title="Minimizar"
          @click="emit('minimizar')"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 14h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm"
          aria-label="Cerrar chat"
          title="Cerrar"
          @click="emit('cerrar')"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M6 6l8 8M14 6l-8 8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <div ref="listaRef" class="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
      <div
        v-for="m in mensajes"
        :key="m.id"
        class="flex"
        :class="m.autor === 'vendedor' ? 'justify-end' : 'justify-start'"
      >
        <div
          class="max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm"
          :class="
            m.autor === 'vendedor'
              ? 'bg-indigo-600 text-white'
              : 'border border-slate-200 bg-white text-slate-800'
          "
        >
          <p class="whitespace-pre-wrap break-words">{{ m.texto }}</p>
          <p
            class="mt-1 text-right text-[11px]"
            :class="m.autor === 'vendedor' ? 'text-indigo-100' : 'text-slate-400'"
          >
            {{ m.hora }}
          </p>
        </div>
      </div>
      <p v-if="enviando" class="text-xs text-slate-500" role="status">Escribiendo...</p>
    </div>

    <footer class="border-t border-slate-200 bg-white p-3">
      <div class="flex items-end gap-2">
        <textarea
          ref="inputRef"
          v-model="borrador"
          rows="2"
          :maxlength="MAX_CARACTERES"
          placeholder="Escribe un mensaje"
          class="min-h-12 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-base"
          @keydown="onKeydown"
        ></textarea>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white disabled:opacity-50"
          aria-label="Enviar mensaje"
          :disabled="!borrador.trim()"
          @click="enviar"
        >
          Enviar
        </button>
      </div>
    </footer>
  </section>
</template>
