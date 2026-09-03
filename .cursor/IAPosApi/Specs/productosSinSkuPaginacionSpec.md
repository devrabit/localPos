# 📄 SPEC: Paginación del listado de productos sin SKU

## 1. 🎯 Objetivo

El listado de productos sin SKU recorre **todo el catálogo de WooCommerce** y pide las **variaciones de cada producto variable**. En catálogos grandes esto tarda mucho y provoca **504 Gateway Timeout** en Hostinger.

Objetivo: cargar el listado **por páginas**, de modo que cada petición solo procese un subconjunto pequeño de productos.

---

## 2. 🧠 Causa de la lentitud

| Paso | Costo |
| ---- | ----- |
| `fetchProducts()` (catálogo completo) | 1 barrido, cacheado |
| `fetchProductVariations(id)` por cada padre variable | **N peticiones a Woo** |

El cuello de botella son las **N peticiones de variaciones**. Con 200 productos variables son 200 llamadas HTTP antes de responder.

**Estrategia:** paginar **a nivel de producto padre**. Cada página solo pide variaciones de los productos de esa página (p. ej. 20 productos → máximo 20 llamadas).

---

## 3. 🔌 API

### GET `/api/productos/sin-sku`

**Query params:**

| Param   | Tipo | Default | Rango | Descripción |
| ------- | ---- | ------- | ----- | ----------- |
| `page`  | int  | `1`     | ≥ 1   | Página de productos |
| `limit` | int  | `20`    | 1–100 | Productos padre por página |
| `q`     | str  | `''`    | ≤ 200 | Filtro por nombre / SKU / ID de producto |

**Response 200:**

```json
{
  "items": [
    {
      "productId": 10,
      "variationId": 101,
      "nombre": "Camiseta — M",
      "tipo": "simple | variacion",
      "precio": 20.0,
      "stock": 5
    }
  ],
  "page": 1,
  "limit": 20,
  "totalProductos": 340,
  "totalPages": 17,
  "hasMore": true
}
```

### Semántica de los totales

* `totalProductos` / `totalPages` cuentan **productos padre recorridos**, no filas sin SKU.
* Una página puede devolver **0 filas** si todos sus productos ya tienen SKU. Eso es válido: el usuario avanza a la siguiente página.
* `items` puede tener **más filas que `limit`** (un producto variable aporta varias variaciones).

---

## 4. ⚡ Rendimiento

* **Catálogo:** se reutiliza la cache existente de `productScan` (stale-while-revalidate).
* **Variaciones:** cache compartida por `productId` (`createCachedVariationFetcher`).
* **Cache de página:** respuesta por clave `page|limit|q` durante `NARIPOS_SIN_SKU_CACHE_MS` (default 120000 ms).
* **Precalentamiento:** al arrancar el servidor solo se precalienta la **página 1** (rápido), no el catálogo completo.
* **Orden estable:** productos ordenados por `name` (locale `es`) antes de paginar, para que la paginación no baile entre peticiones.

---

## 5. 🖥️ UI/UX

### Controles nuevos en `/codigos-barras/sin-sku`

| Elemento | Comportamiento |
| -------- | -------------- |
| Buscador | Filtro **server-side** con debounce 350 ms; resetea a página 1 |
| Selector por página | 20 / 50 / 100 productos; resetea a página 1 |
| Anterior / Siguiente | Deshabilitados en los extremos o mientras carga |
| Indicador | "Página X de Y · N productos" |
| Filas encontradas | "N sin SKU en esta página" |
| Página vacía | Mensaje: todos los productos de esta página tienen SKU; invitar a avanzar |

### Estados

* **Cargando:** mensaje de carga; controles deshabilitados.
* **Error 504 / timeout:** mensaje explicando que se reintente o se baje el `limit`.
* **Sin resultados de búsqueda:** mensaje específico.

---

## 6. 🧪 Criterios de aceptación

- [ ] `GET /api/productos/sin-sku` acepta `page`, `limit`, `q`
- [ ] Solo se piden variaciones de los productos de la página solicitada
- [ ] Respuesta incluye `page`, `limit`, `totalProductos`, `totalPages`, `hasMore`
- [ ] Params inválidos → `400`
- [ ] `limit` se acota a 100 como máximo
- [ ] Cache por página evita repetir el trabajo dentro de la ventana de cache
- [ ] Sincronizar un SKU invalida la cache de páginas
- [ ] UI permite navegar páginas y cambiar tamaño de página
- [ ] Búsqueda se resuelve en servidor y resetea a página 1

---

## 7. ⚠️ Compatibilidad

Llamar al endpoint **sin params** sigue funcionando: devuelve la primera página con `limit` 20. El contrato de cada fila (`SinSkuItem`) no cambia.

---

## 8. 📁 Archivos afectados

| Capa | Archivo |
| ---- | ------- |
| Spec | `.cursor/IAPosApi/Specs/productosSinSkuPaginacionSpec.md` |
| Backend | `backend/src/utils/productsWithoutSku.js` (paginación + cache por página) |
| Backend | `backend/src/routes/api.js` (validación de query) |
| Backend | `backend/src/server.js` (precalentar solo página 1) |
| Frontend | `frontend/src/views/ProductosSinSkuView.vue` (controles de paginación) |
| Tests | `backend/tests/api.test.js`, `backend/tests/productsWithoutSkuCache.test.js` |
