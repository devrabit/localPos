# SPEC: Método de pago "Mixto"

## 1. Objetivo

Agregar el método de pago `MIXTO` al flujo de venta del POS para permitir dividir el pago entre:

- `Transferencia virtual`
- `Pago en efectivo`

Cuando el vendedor seleccione `Mixto`, la UI debe mostrar:

1. Una casilla para ingresar el monto de `Transferencia virtual`.
2. Una casilla con calculadora de cambio para `efectivo` (dinero recibido y cálculo de cambio).

## 2. Alcance

### Incluye

- Frontend:
  - Nueva opción de método de pago `Mixto`.
  - Render condicional de bloque transferencia + bloque efectivo cuando se seleccione `Mixto`.
  - Validación de montos para habilitar confirmación.
  - Envío del payload con desglose mixto.
- Backend:
  - Aceptar `MIXTO` como método válido.
  - Validar componentes de pago mixto.
  - Guardar metadatos de desglose (`transferencia`, `efectivo recibido`, `cambio`).

### No incluye

- Nuevos métodos de pago adicionales.
- Refactor de arquitectura.
- Cambios visuales mayores fuera de la sección de pago.

## 3. Reglas funcionales

### 3.1 Selección

- Métodos disponibles:
  - `EFECTIVO`
  - `TRANSFERENCIA`
  - `MIXTO`

### 3.2 Comportamiento de UI para `MIXTO`

- Mostrar input obligatorio: `Monto transferencia`.
- Mostrar calculadora de efectivo:
  - Input obligatorio: `Dinero recibido en efectivo`.
  - Mostrar `Cambio` (puede ser 0 o positivo; negativo indica insuficiente).

### 3.3 Validación de montos en `MIXTO`

Sea `T` total de la venta:

- `transferencia` debe ser número válido `>= 0`.
- `efectivo_recibido` debe ser número válido `>= 0`.
- `efectivo_requerido = T - transferencia`.
- Debe cumplirse:
  - `transferencia <= T`
  - `efectivo_recibido >= efectivo_requerido`
- Cambio en mixto:
  - `cambio = efectivo_recibido - efectivo_requerido`

### 3.4 Habilitación de checkout

En `MIXTO`, el botón confirmar solo se habilita cuando:

- Hay método seleccionado.
- `transferencia` es válido y no supera el total.
- `efectivo_requerido` está cubierto por `efectivo_recibido`.

## 4. Contrato de datos

### 4.1 Frontend state

Agregar estado mínimo:

- `mixedTransferStr`
- Reusar `cashReceivedStr` para efectivo recibido.

### 4.2 Payload a backend (`POST /orden`)

Cuando `payment_method = MIXTO`:

```json
{
  "payment_method": "MIXTO",
  "mixed_transfer": 30000,
  "cash_received": 25000,
  "items": []
}
```

Compatibilidad camelCase:

- `mixedTransfer`
- `cashReceived`

## 5. Reglas backend

- `payment_method` acepta: `EFECTIVO | TRANSFERENCIA | MIXTO`.
- Si `MIXTO`:
  - `mixed_transfer` requerido y válido.
  - `cash_received` requerido y válido.
  - Calcular total de orden.
  - Validar cobertura efectiva:
    - `cash_received >= total - mixed_transfer`
  - Guardar en `meta_data`:
    - `_naripos_mixed_transfer`
    - `_naripos_cash_received`
    - `_naripos_change`

## 6. Integración WooCommerce

Mantener arquitectura actual:

- `payment_method`: continuar usando `cod` o `bacs` según implementación actual.
- `payment_method_title`:
  - `Pago mixto`

No alterar el flujo general de creación de orden.

## 7. Archivos impactados (esperados)

- `frontend/src/stores/carrito.js`
- `frontend/src/components/CartPanel.vue`
- `backend/src/routes/api.js`
- Tests mínimos:
  - `frontend/src/stores/carrito.test.js`
  - `backend/tests/api.test.js` o `backend/tests/ordenes.test.js`

## 8. Criterios de aceptación

1. Se visualiza opción `Mixto` en método de pago.
2. Al seleccionar `Mixto` aparecen input de transferencia e input de efectivo con cálculo de cambio.
3. Si montos inválidos, checkout deshabilitado y/o error claro.
4. Si montos válidos, se crea la orden correctamente.
5. Backend rechaza `Mixto` incompleto o insuficiente con `400`.
6. Se mantiene comportamiento actual de `Efectivo` y `Transferencia`.
