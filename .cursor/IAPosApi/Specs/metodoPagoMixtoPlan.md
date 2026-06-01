# PLAN: Implementación método de pago "Mixto"

## Objetivo del plan

Implementar `MIXTO` con el menor cambio posible, reutilizando la lógica existente de efectivo/cambio y respetando la arquitectura actual (store + componente + validación backend).

## Paso 1: Extender constantes y estado en store

Archivo: `frontend/src/stores/carrito.js`

- Agregar `PAYMENT_METHODS.MIXED = 'MIXTO'`.
- Agregar opción visual en `PAYMENT_OPTIONS`:
  - `Mixto (transferencia + efectivo)`.
- Agregar estado:
  - `mixedTransferStr`.
- Ajustar `setPaymentMethod` para limpiar campos según método:
  - Si no es `CASH` ni `MIXED`, limpiar `cashReceivedStr`.
  - Si no es `MIXED`, limpiar `mixedTransferStr`.

## Paso 2: Cálculos y validaciones mixtas en store

Archivo: `frontend/src/stores/carrito.js`

- Crear computed:
  - `mixedTransferParsed`
  - `mixedCashRequired`
  - `mixedChangeMinor`
  - `mixedReadyForCheckout`
- Reusar utilidades actuales (`moneyToMinor`, `parseCashReceivedInput`, etc.).
- Integrar en `cashReadyForCheckout` (o crear readiness general) para que `MIXTO` valide:
  - `transferencia <= total`
  - `efectivo recibido >= efectivo requerido`

## Paso 3: Payload mixto desde frontend

Archivo: `frontend/src/stores/carrito.js`

- En `crearOrden`, cuando método sea `MIXTO`:
  - Validar transferencia y efectivo.
  - Enviar:
    - `mixed_transfer` + `mixedTransfer`
    - `cash_received` + `cashReceived`
- Mantener payload actual para métodos existentes.
- Mantener `lastFactura` con `metodo_pago` y agregar datos mixtos mínimos para impresión/resumen si aplica.

## Paso 4: UI mínima para método mixto

Archivo: `frontend/src/components/CartPanel.vue`

- Mostrar bloque actual de efectivo para `CASH` y `MIXED`.
- En `MIXED`, mostrar input adicional:
  - `Monto transferencia`.
- Mostrar resumen para mixto:
  - Total
  - Transferencia
  - Efectivo requerido
  - Efectivo recibido
  - Cambio
- Ajustar mensajes de insuficiencia para el caso mixto.

## Paso 5: Validación backend para MIXTO

Archivo: `backend/src/routes/api.js`

- Extender enum de método de pago para incluir `MIXTO`.
- Extender schema (`createOrderSchema`) para aceptar:
  - `mixed_transfer` / `mixedTransfer`.
- En `POST /orden`:
  - Si `MIXTO`, validar campos requeridos.
  - Calcular total y cobertura de efectivo restante.
  - Setear:
    - `payment_method_title = 'Pago mixto'`
    - metadatos `_naripos_mixed_transfer`, `_naripos_cash_received`, `_naripos_change`.

## Paso 6: Pruebas mínimas de regresión y nuevo caso

Archivos esperados:

- `frontend/src/stores/carrito.test.js`
- `backend/tests/api.test.js` o `backend/tests/ordenes.test.js`

Casos:

1. `MIXTO` válido -> checkout permitido / orden creada.
2. `MIXTO` con efectivo insuficiente -> rechazo.
3. `MIXTO` con transferencia mayor al total -> rechazo.
4. `EFECTIVO` y `TRANSFERENCIA` siguen funcionando igual.

## Paso 7: Verificación final local

- Ejecutar solo pruebas necesarias del frontend/backend relacionadas al flujo de orden.
- Confirmar que no se alteran módulos no relacionados.

## Resultado esperado

- Método `Mixto` operativo con dos casillas solicitadas.
- Validación sólida en frontend y backend.
- Arquitectura actual preservada.
- Cambios estrictamente necesarios.
