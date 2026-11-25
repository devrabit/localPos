const test = require('node:test')
const assert = require('node:assert')
const {
  datafonoCommission,
  wooPaymentFromMethod,
  feeCharges,
} = require('../src/utils/datafonoFee')

test('comision datafono es el 4% redondeado a centavos', () => {
  assert.equal(datafonoCommission(10000), 400)
  assert.equal(datafonoCommission(10.55), 0.42)
  assert.equal(datafonoCommission(19.99), 0.8)
  assert.equal(datafonoCommission(0), 0)
  assert.equal(datafonoCommission(-5), 0)
})

test('datafono se mapea a Woo con titulo visible', () => {
  assert.deepEqual(wooPaymentFromMethod('DATAFONO'), {
    payment_method: 'datafono',
    payment_method_title: 'Pago con datafono',
  })
  assert.equal(wooPaymentFromMethod('EFECTIVO').payment_method, 'cod')
  assert.equal(wooPaymentFromMethod('TRANSFERENCIA').payment_method, 'bacs')
})

test('feeCharges ignora cargos en cero', () => {
  assert.deepEqual(
    feeCharges([
      { name: 'Comision datafono (4%)', total: '400.00' },
      { name: 'Cero', total: '0' },
    ]),
    [{ nombre: 'Comision datafono (4%)', amount: 400 }],
  )
})
