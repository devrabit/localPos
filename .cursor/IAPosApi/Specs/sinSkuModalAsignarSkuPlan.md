# 🧭 PLAN: Popup para asignar SKU desde el listado sin SKU

Basado en `sinSkuModalAsignarSkuSpec.md`. **Sin cambios en backend.**

---

## Paso 1 — Validación compartida en el cliente

**Nuevo:** `frontend/src/utils/barcodeValidation.js`

Puerto del módulo de backend `backend/src/utils/barcodeValidation.js` a ES modules:

* `validarCode128(raw)` — no vacío, máx. 80, ASCII 32–126
* `validarEan13(raw)` — normaliza 12 dígitos añadiendo checksum; verifica 13
* `validarCodigoBarras(tipo, raw)` — despacha por tipo

Devuelve la misma forma que el backend: `{ ok, text }` o `{ ok: false, error }`.

**Motivo:** feedback inmediato al escribir sin ir al servidor, con mensajes idénticos a los que devolverá Woo.

## Paso 2 — Componente del modal

**Nuevo:** `frontend/src/components/AsignarSkuModal.vue`

* **Props:** `item` (fila `SinSkuItem`: `productId`, `variationId`, `nombre`, `tipo`)
* **Emits:** `close`, `saved` (payload: `{ productId, variationId, sku }`)
* **Estado local:** `sku`, `tipo`, `guardando`, `error`
* **Sugerencia inicial:** `String(item.variationId ?? item.productId)`
* **Validación reactiva:** `computed` que llama a `validarCodigoBarras`
* **Vista previa:** `JsBarcode` en un `<svg>`, redibujado con `watch` sobre `sku` y `tipo`
* **Guardar:** `POST /barcode/sync-product` con `productId`, `barcode`, `type` y `variationId` solo si existe
* **Cierre:** `@click.self` en el overlay, `@keydown.esc`, botón Cancelar
* **Foco:** `ref` en el input + `onMounted` con `focus()` y `select()`
* **Enlace:** `router-link` a `/codigos-barras?productId=…&variationId=…` para imprimir
* Atributo `data-no-barcode-scan` en el panel (evita que el lector capture las teclas)

**Reutilizo el patrón visual de `VariationPickerModal.vue`** (overlay, panel, encabezado/cuerpo/pie, botones de 48 px) para mantener consistencia.

## Paso 3 — Integrar en el listado

`frontend/src/views/ProductosSinSkuView.vue`

* Estado nuevo: `itemSeleccionado` (null = modal cerrado), `aviso`
* `irAGenerar(item)` pasa a `abrirModal(item)` → asigna `itemSeleccionado`
  * **Se elimina** el `router.push` (ya no navega)
* Handler `onSkuGuardado(payload)`:
  1. Filtrar la fila de `items` por `productId` + `variationId`
  2. Mostrar aviso temporal *"SKU asignado a {nombre}"* (timeout ~4 s)
  3. Cerrar el modal
  4. Si `items` quedó vacío y `totalPages > 1`, llamar `cargar()` para refrescar
* Renderizar `<AsignarSkuModal v-if="itemSeleccionado" :item="itemSeleccionado" @close @saved />`
* Limpiar el timeout del aviso en `onUnmounted` (ya existe uno para el debounce de búsqueda)

## Paso 4 — Tests

**Nuevo:** `frontend/src/utils/barcodeValidation.test.js` (Vitest, ya configurado en el proyecto)

Casos:
* CODE128 válido / vacío / >80 chars / carácter no ASCII
* EAN13 con 12 dígitos → completa checksum
* EAN13 con 13 dígitos válidos → acepta
* EAN13 con checksum incorrecto → error
* EAN13 con largo inválido → error

## Paso 5 — Verificación en vivo

1. `cd backend && npm test` — no debe romperse nada (no toco backend, pero confirmo)
2. `cd frontend && npm test` — validación nueva en verde
3. Levantar backend en `:3001` y Vite en `:5173`
4. Probar en navegador: abrir modal en fila simple y en fila de variación, validar EAN13, guardar y confirmar que la fila desaparece
5. `npm run build` en la raíz para regenerar `dist`

## Paso 6 — Entrega

* Commit y push a `deployWithBD` (rama de deploy Hostinger), incluyendo `dist`

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| El lector de barras escribe en el input del modal | `data-no-barcode-scan` en el panel |
| Doble clic en Guardar crea dos peticiones | `guardando` deshabilita el botón |
| Fila eliminada localmente pero Woo falló | Solo se elimina tras `ok: true` |
| Página queda vacía tras asignar el último ítem | Recarga condicional de la página actual |
| Duplicar reglas de validación cliente/servidor | Mismo texto de errores; el servidor sigue siendo la autoridad |

---

## Fuera de alcance (confirmado con el SPEC)

* Impresión dentro del modal
* Asignación masiva de varias filas
* Validación de SKU duplicado en el cliente

---

## ⏸️ Estado: pendiente de aprobación

No se ha escrito código. Esperando tu **OK** o cambios sobre el SPEC/PLAN para pasar a la fase CODE.
