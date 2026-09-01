# PLAN: Rendimiento del lector de código de barras (búsqueda por variaciones)

Spec: `escaneoVariacionesRendimientoSpec.md`
Skills: `Skills/BackendNode.md`, `Skills/WooCommerce.md`, `Skills/FrontentVue.md`

La entrega se divide en fases. **Fase 1 y 2 son la entrega recomendada**; las fases 3 y 4 quedan
condicionadas a lo que muestren las mediciones.

---

## Fase 0 — Instrumentación (prerrequisito)

1. `backend/src/utils/productScan.js`
   - `findProductByScanCode` devuelve además `metricas: { msTotal, msListado, msVariaciones, peticionesWoo, origen }`.
   - `origen`: `'indice'` | `'lookup'` | `'barrido'`.
2. `backend/src/routes/api.js` (`GET /productos/escaneo`)
   - `res.set('X-Scan-Ms', String(metricas.msTotal))`.
   - `console.info` con línea estructurada (código, resultado, métricas). Sin datos sensibles.
3. Test: `backend/tests/productScan.test.js` — verificar que la respuesta incluye el header y que
   el cuerpo JSON **no** cambia de forma.

---

## Fase 1 — Lookup nativo por SKU en WooCommerce

1. `backend/src/services/wooClient.js`
   - `fetchProductsBySku(sku)` → `GET /products` con `{ sku, per_page: 10, status, _fields: 'id,type,parent_id,sku' }`,
     `timeout: 10000` (es una consulta indexada; no necesita los 120 s de los listados).
   - `fetchVariationById(productId, variationId)` → `GET /products/{productId}/variations/{variationId}`.
   - Exportar ambas en `module.exports`.

2. `backend/src/utils/productScan.js` — reordenar `findProductByScanCode`:
   - **Paso A**: match en productos simples de la lista cacheada (comportamiento actual, ya es en memoria).
   - **Paso B (nuevo)**: `fetchProductsBySku(q)`.
     - Filtrar el resultado con `skuMatchesScan` (Woo puede devolver coincidencias de una lista separada por comas).
     - `parent_id > 0` → variación: resolver el padre desde la lista cacheada
       (o `fetchProductById` si no está) y la variación con `fetchVariationById`, **en paralelo** con `Promise.all`.
       Devolver `{ tipo: 'variacion', producto, variacion }`.
     - `parent_id === 0` e `isVariableProductType(type)` → `{ tipo: 'variable_sin_elegir', producto }`.
     - `parent_id === 0` y simple → localizar el producto completo en la lista cacheada
       (o `fetchProductById`) y devolver `{ tipo: 'simple', producto }`.
     - Errores de red o respuesta vacía: **no propagar**, continuar al Paso C.
   - **Paso C (fallback)**: barrido por lotes actual, intacto.
   - **Paso D**: fallback de SKU de padre variable, intacto.
   - La firma sigue aceptando `fetchVariationsRaw` para no romper los tests existentes; las funciones
     nuevas se inyectan por un parámetro opcional `deps` con valores por defecto (facilita el mock).

3. Tests nuevos en `backend/tests/productScan.test.js`:
   - Variación resuelta por lookup: mock devuelve `{ id, parent_id, type: 'variation' }` →
     resultado `variacion` y **cero** llamadas a `fetchProductVariations` de barrido.
   - Lookup que lanza error → cae al barrido y sigue encontrando la variación.
   - Lookup vacío → cae al barrido.
   - Producto simple y `variable_sin_elegir` vía lookup.
   - Los casos existentes (`variable-subscription`, `meta_data._sku`, código inexistente) siguen verdes.

---

## Fase 2 — Cache que no bloquea

1. `backend/src/utils/productScan.js`
   - `getCachedProductList`: **stale-while-revalidate**. Si `now - cachedAt >= CACHE_MS` pero hay
     `cachedList`, devolver la copia vieja y disparar el refresco en background con un flag
     `refreshing` para no lanzar refrescos duplicados. Solo se espera cuando no hay cache alguna.
   - `variationsCache`: `Map<parentId, { data, at }>` a nivel de módulo con TTL propio
     (`NARIPOS_VARIATIONS_CACHE_MS`, por defecto 120000), reemplazando el `Map` por request.
   - `negativeCache`: `Map<codigo, at>` con TTL `NARIPOS_SCAN_NEGATIVE_MS` (por defecto 15000).
     Consultar al inicio y poblar al devolver `null`.
   - `invalidateProductosScanCache()` limpia las tres caches.
   - `warmProductosScanCache(woo)`: precarga el listado; no lanza si falla.

2. `backend/src/server.js`
   - Llamar a `warmProductosScanCache(woo)` tras el arranque, sin bloquear el `listen`
     (mismo patrón no bloqueante que el health de MySQL).

3. `backend/src/routes/barcode.js`
   - En `POST /barcode/sync-product`, tras `updateProductSku`, llamar a `invalidateProductosScanCache()`.
     Hoy el SKU cambia en Woo y la cache del escaneo queda desactualizada hasta 120 s.

4. Tests:
   - Cache expirada devuelve el valor viejo sin esperar y refresca después.
   - Segundo escaneo de un código inexistente no vuelve a llamar a Woo.
   - `sync-product` invalida la cache.

5. Ajuste de timeouts (solo al final de esta fase, con las métricas ya visibles):
   - `LIST_TIMEOUT_MS` 120000 → 30000.
   - `frontend/src/services/api.js` timeout 120000 → 20000.

---

## Fase 3 — Índice persistente en MySQL (condicional)

Ejecutar **solo si** las métricas de las fases 1–2 siguen por encima del objetivo.

1. `backend/db/schema.sql`: tabla `sku_index` según el SPEC. Añadirla también al arranque
   que ya asegura el schema.
2. `backend/src/services/skuIndexStorage.js`: `lookup(sku)`, `upsert(rows)`, `rebuild(woo)`.
3. `productScan.js`: consultar `skuIndexStorage.lookup` antes del lookup de Woo.
4. `POST /barcode/sync-product`: `upsert` inmediato del par código → producto.
5. Reconstrucción en background al arranque y cada `NARIPOS_SKU_INDEX_REFRESH_MS`.
6. Tests con mock de la capa de storage.

---

## Fase 4 — Índice de SKU en el frontend (condicional)

1. `GET /api/productos/escaneo/indice` con la forma compacta del SPEC.
2. `frontend/src/stores/productos.js`: cargar y cachear el índice en `localStorage`
   (clave versionada nueva, p. ej. `pos_sku_index_v1`); `coincidenciasEscaneoLocales`
   resuelve variaciones además de padres.
3. `frontend/src/views/PosView.vue`: si el índice resuelve local, beep y feedback inmediatos;
   el detalle de la variación se pide en paralelo.
4. Test de la nueva ruta en `backend/tests/api.test.js`.

---

## Verificación

- `cd backend && npm test` verde en cada fase.
- Prueba manual en el POS: escanear un SKU de variación y confirmar en el log
  `origen: 'lookup'` y `peticionesWoo <= 2`.
- Comparar `X-Scan-Ms` antes y después con el catálogo real.

---

## Orden de commits sugerido

1. `feat(scan): instrumentar tiempos del escaneo`
2. `perf(scan): resolver variaciones con lookup nativo por SKU de Woo`
3. `perf(scan): cache stale-while-revalidate, variaciones y negativa`
4. `chore(scan): ajustar timeouts tras el lookup por SKU`

(Fases 3 y 4, en commits aparte, solo si se aprueban tras medir.)
