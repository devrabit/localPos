<script setup>
import { PAYMENT_OPTIONS } from '../stores/carrito'

defineProps({
  items: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  checkoutLoading: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['inc', 'dec', 'remove', 'checkout', 'update:paymentMethod'])
</script>

<template>
  <section class="rounded-xl bg-white p-4 shadow-sm">
    <h2 class="mb-3 text-xl font-semibold text-slate-900">Carrito</h2>
    <div v-if="!items.length" class="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
      Aun no hay productos en el carrito.
    </div>
    <div v-else class="space-y-2">
      <article
        v-for="item in items"
        :key="item.lineKey"
        class="rounded-lg border border-slate-200 p-3"
      >
        <p class="font-medium text-slate-900">{{ item.nombre }}</p>
        <p class="text-sm text-slate-500">$ {{ item.precio.toFixed(2) }}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="min-h-12 min-w-12 rounded-lg bg-slate-100 px-4 py-3 text-xl font-semibold leading-none"
            @click="emit('dec', item.lineKey)"
          >
            -
          </button>
          <span class="min-w-10 text-center text-lg font-medium">{{ item.cantidad }}</span>
          <button
            type="button"
            class="min-h-12 min-w-12 rounded-lg bg-slate-100 px-4 py-3 text-xl font-semibold leading-none disabled:opacity-40"
            :disabled="item.maxStock >= 0 && item.cantidad >= item.maxStock"
            @click="emit('inc', item.lineKey)"
          >
            +
          </button>
          <button
            type="button"
            class="ml-auto min-h-12 rounded-lg bg-rose-100 px-4 py-2 text-base font-medium text-rose-700"
            @click="emit('remove', item.lineKey)"
          >
            Quitar
          </button>
        </div>
      </article>
    </div>

    <div class="mt-4 border-t border-slate-200 pt-3">
      <p class="text-lg font-bold text-slate-900">Total: $ {{ total.toFixed(2) }}</p>
      <fieldset class="mt-3">
        <legend class="mb-2 text-sm font-semibold text-slate-800">Metodo de pago *</legend>
        <div class="grid gap-2">
          <label
            v-for="option in PAYMENT_OPTIONS"
            :key="option.value"
            class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
          >
            <input
              :checked="paymentMethod === option.value"
              type="radio"
              name="payment-method"
              :value="option.value"
              @change="emit('update:paymentMethod', option.value)"
            />
            <span class="text-sm text-slate-800">{{ option.label }}</span>
          </label>
        </div>
      </fieldset>
      <button
        type="button"
        class="mt-3 min-h-14 w-full rounded-lg bg-indigo-600 px-4 py-4 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        :disabled="!items.length || checkoutLoading || !paymentMethod"
        @click="emit('checkout')"
      >
        {{ checkoutLoading ? 'Enviando...' : 'Confirmar venta' }}
      </button>
    </div>
  </section>
</template>
