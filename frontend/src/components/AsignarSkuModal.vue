<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import api from '../services/api'
import { validarCodigoBarras } from '../utils/barcodeValidation'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close', 'saved'])

const skuInput = ref('')
const tipo = ref('CODE128')
const guardando = ref(false)
const errorServidor = ref('')
const previewSvg = ref(null)
const inputRef = ref(null)

const sugerenciaInicial = computed(() =>
  String(props.item.variationId ?? props.item.productId ?? ''),
)

const validacion = computed(() => validarCodigoBarras(tipo.value, skuInput.value))

const puedeGuardar = computed(() => validacion.value.ok && !guardando.value)

const codigosBarrasLink = computed(() => {
  const query = { productId: String(props.item.productId) }
  if (props.item.variationId != null) query.variationId = String(props.item.variationId)
  return { path: '/codigos-barras', query }
})

function tipoLabel(tipoItem) {
  if (tipoItem === 'variacion') return 'Variacion'
  return 'Simple'
}

function tipoBadgeClass(tipoItem) {
  if (tipoItem === 'variacion') return 'bg-violet-100 text-violet-800'
  return 'bg-sky-100 text-sky-800'
}

function dibujarVistaPrevia() {
  const el = previewSvg.value
  if (!el) return
  el.innerHTML = ''
  if (!validacion.value.ok) return
  try {
    const fmt = tipo.value === 'EAN13' ? 'EAN13' : 'CODE128'
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    el.appendChild(svg)
    JsBarcode(svg, validacion.value.text, {
      format: fmt,
      displayValue: true,
      margin: 8,
      width: 2,
      height: 60,
    })
  } catch {
    el.innerHTML = ''
  }
}

watch([skuInput, tipo, validacion], () => {
  errorServidor.value = ''
  nextTick(dibujarVistaPrevia)
})

watch(previewSvg, () => nextTick(dibujarVistaPrevia))

function onEscape(e) {
  if (e.key === 'Escape' && !guardando.value) emit('close')
}

onMounted(() => {
  skuInput.value = sugerenciaInicial.value
  window.addEventListener('keydown', onEscape)
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
    dibujarVistaPrevia()
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onEscape)
})

async function guardar() {
  if (!validacion.value.ok) return
  guardando.value = true
  errorServidor.value = ''
  try {
    const body = {
      productId: props.item.productId,
      barcode: validacion.value.text,
      type: tipo.value,
    }
    if (props.item.variationId != null) {
      body.variationId = props.item.variationId
    }
    await api.post('/barcode/sync-product', body)
    emit('saved', {
      productId: props.item.productId,
      variationId: props.item.variationId ?? null,
      sku: validacion.value.text,
      nombre: props.item.nombre,
    })
  } catch (err) {
    errorServidor.value =
      err?.response?.data?.error || err?.message || 'No se pudo guardar el SKU en WooCommerce'
  } finally {
    guardando.value = false
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="asignar-sku-titulo"
    @click.self="!guardando && emit('close')"
  >
    <div
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      data-no-barcode-scan
      @click.stop
    >
      <div class="border-b border-slate-200 px-4 py-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <h3 id="asignar-sku-titulo" class="text-lg font-semibold text-slate-900">
              {{ item.nombre }}
            </h3>
            <p class="text-sm text-slate-500">
              Producto #{{ item.productId }}
              <template v-if="item.variationId"> · Variacion #{{ item.variationId }}</template>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="tipoBadgeClass(item.tipo)"
          >
            {{ tipoLabel(item.tipo) }}
          </span>
        </div>
      </div>

      <form class="space-y-4 p-4" @submit.prevent="guardar">
        <div>
          <label for="sku-asignar" class="mb-1 block text-sm font-semibold text-slate-800">SKU</label>
          <input
            id="sku-asignar"
            ref="inputRef"
            v-model="skuInput"
            type="text"
            autocomplete="off"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            :disabled="guardando"
          />
          <p v-if="!validacion.ok && skuInput.trim()" class="mt-1 text-sm text-rose-600" role="alert">
            {{ validacion.error }}
          </p>
        </div>

        <div>
          <label for="tipo-codigo" class="mb-1 block text-sm font-semibold text-slate-800">Tipo de codigo</label>
          <select
            id="tipo-codigo"
            v-model="tipo"
            class="min-h-12 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
            :disabled="guardando"
          >
            <option value="CODE128">CODE128</option>
            <option value="EAN13">EAN13</option>
          </select>
        </div>

        <div>
          <p class="mb-2 text-sm font-semibold text-slate-800">Vista previa</p>
          <div
            ref="previewSvg"
            class="flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4"
          />
          <p
            v-if="!validacion.ok && skuInput.trim()"
            class="mt-2 text-center text-sm text-slate-500"
          >
            Corrige el SKU para ver la vista previa
          </p>
        </div>

        <p v-if="errorServidor" class="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800" role="alert">
          {{ errorServidor }}
        </p>

        <div class="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row">
          <button
            type="button"
            class="min-h-12 flex-1 rounded-lg border border-slate-300 font-semibold text-slate-800"
            :disabled="guardando"
            @click="emit('close')"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="min-h-12 flex-1 rounded-lg bg-indigo-600 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!puedeGuardar"
          >
            {{ guardando ? 'Guardando…' : 'Guardar SKU' }}
          </button>
        </div>

        <router-link
          :to="codigosBarrasLink"
          class="block text-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          @click="emit('close')"
        >
          Abrir en codigos de barras (imprimir etiqueta)
        </router-link>
      </form>
    </div>
  </div>
</template>
