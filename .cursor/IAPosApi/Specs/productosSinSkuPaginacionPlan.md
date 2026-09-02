# 🧭 PLAN: Paginación del listado de productos sin SKU

Basado en `productosSinSkuPaginacionSpec.md`.

---

## Paso 1 — Backend: paginar a nivel de producto padre

`backend/src/utils/productsWithoutSku.js`

* Nueva función `getProductsWithoutSkuPage(woo, { page, limit, q })`:
  1. `getCachedProductList(woo)` — catálogo cacheado.
  2. Filtrar por `q` sobre `name`, `sku` e `id` del producto padre.
  3. Ordenar por `name` con locale `es` (orden estable para paginar).
  4. Cortar el slice `[(page-1)*limit, page*limit]`.
  5. Ejecutar `findProductsWithoutSku` **solo sobre ese slice**.
* Cache por página: `Map` con clave `page|limit|q` y TTL `NARIPOS_SIN_SKU_CACHE_MS`.
* `invalidateSinSkuCache()` limpia el `Map` completo.
* `warmSinSkuCache(woo)` precalienta únicamente **página 1**.

## Paso 2 — Backend: validar query en la ruta

`backend/src/routes/api.js`

* Schema Zod: `page` (int ≥ 1, default 1), `limit` (int 1–100, default 20), `q` (string ≤ 200, default '').
* `ZodError` → `400` con mensaje claro.
* Responder el objeto paginado tal cual.

## Paso 3 — Backend: arranque

`backend/src/server.js`

* Mantener `warmProductosScanCache` y luego `warmSinSkuCache` (ahora solo página 1, mucho más rápido).

## Paso 4 — Frontend: controles de paginación

`frontend/src/views/ProductosSinSkuView.vue`

* Estado: `page`, `limit`, `search`, `totalPages`, `totalProductos`, `hasMore`.
* `cargar()` envía `page`, `limit`, `q` al backend.
* Buscador con **debounce 350 ms** → resetea `page` a 1.
* Selector de tamaño de página (20 / 50 / 100) → resetea `page` a 1.
* Botones **Anterior** / **Siguiente** deshabilitados en extremos o durante carga.
* Quitar el filtrado local (ahora lo hace el servidor).
* Mensaje específico cuando la página no tiene filas sin SKU.

## Paso 5 — Tests

* `backend/tests/api.test.js`: página respeta `limit`, no pide variaciones fuera de la página, params inválidos → 400.
* `backend/tests/productsWithoutSkuCache.test.js`: cache por página; invalidación fuerza recarga.

## Paso 6 — Entrega

* `cd backend && npm test` (todo verde).
* `npm run build` en la raíz para regenerar `dist`.
* Commit + push a `deployWithBD` (rama de deploy Hostinger).

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| Página sin filas confunde al usuario | Mensaje explícito invitando a avanzar de página |
| Orden inestable entre peticiones | Ordenar por `name` antes de paginar |
| `limit` alto vuelve a ser lento | Tope duro de 100 y default conservador de 20 |
| Cache sirve datos viejos tras editar SKU | `invalidateSinSkuCache()` en `sync-product` y en creación de orden |
