import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, nextTick, ref } from 'vue'
import CartPanel from './CartPanel.vue'

const items = [{ lineKey: 'p-1', nombre: 'Cafe', precio: 10000, cantidad: 1, maxStock: -1 }]

function mountHarness() {
  const paymentMethod = ref('')
  const Harness = defineComponent({
    components: { CartPanel },
    setup() {
      return { items, total: 10000, paymentMethod }
    },
    template: `
      <CartPanel
        :items="items"
        :total="total"
        :payment-method="paymentMethod"
        @update:payment-method="paymentMethod = $event"
      />
    `,
  })
  const el = document.createElement('div')
  document.body.innerHTML = ''
  document.body.appendChild(el)
  const app = createApp(Harness)
  app.mount(el)
  return { el, app, paymentMethod }
}

function radioByLabel(el, label) {
  return [...el.querySelectorAll('input[type="radio"]')].find((input) =>
    input.parentElement.textContent.includes(label),
  )
}

describe('CartPanel pago con datafono', () => {
  it('muestra el medio y suma 4% solo cuando esta seleccionado', async () => {
    const { el } = mountHarness()
    await nextTick()

    expect(el.textContent).toContain('Pago con datafono')
    expect(el.textContent).toContain('Total: $ 10000.00')
    expect(el.textContent).not.toContain('Comision datafono')

    radioByLabel(el, 'Pago con datafono').dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()

    expect(el.textContent).toContain('Subtotal: $ 10000.00')
    expect(el.textContent).toContain('Comision datafono (4%): $ 400.00')
    expect(el.textContent).toContain('Total: $ 10400.00')

    radioByLabel(el, 'Pago en efectivo').dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()

    expect(el.textContent).not.toContain('Comision datafono')
    expect(el.textContent).toContain('Total: $ 10000.00')
  })
})
