# SPEC: Rendimiento del lector de código de barras (búsqueda por variaciones)

## 1. Objetivo

Reducir el tiempo entre el "beep" del lector y el producto agregado al carrito cuando el
código escaneado corresponde a una **variación**, que hoy es el peor caso del sistema.

Meta: **p95 < 1 s** en el primer escaneo del día y **p95 < 150 ms** en escaneos posteriores,
sin cambiar el comportamiento funcional ya validado (simple / variación / variable sin elegir).

---

## 2. Diagnóstico del estado actual

Flujo actual (`GET /api/productos/escaneo` → `findProductByScanCode`):

1. `getCachedProductList(woo)` → `fetchProducts()`: trae **todo** el catálogo paginado de 100 en 100,
   secuencialmente. Cache en memoria de 120 s.
2. Recorre productos simples buscando SKU exacto (rápido, en memoria).
3. Si no hay match, para **cada padre variable** hace `GET /products/{id}/variations`,
   en lotes de 8 en paralelo, hasta encontrar el SKU.
4. Fallback: SKU del padre variable → `variable_sin_elegir`.

### Costo real

| Escenario | Peticiones a Woo | Comentario |
|---|---|---|
| Simple, cache caliente | 0 | Instantáneo |
| Simple, cache fría | ceil(P/100) secuenciales | P = total de productos |
| **Variación** | 1 listado + hasta **V** peticiones (V = padres variables), en ceil(V/8) rondas | **Peor caso** |
| Código inexistente | Igual que variación, siempre completo, sin early-exit | Se paga el costo entero |

Con 150 padres variables y ~400 ms por petición a WooCommerce: **≈ 19 rondas ≈ 7,6 s**,
más el listado si la cache expiró. Esto explica por qué los timeouts se subieron a 120 s
(`frontend/src/services/api.js`, `LIST_TIMEOUT_MS` en `wooClient.js`): son un parche al síntoma.

### Otros costos detectados

- **Cache de 120 s sin refresco en background**: cada 2 minutos un cajero paga el listado completo.
- **`variationCache` es por request**: escanear dos variaciones del mismo padre pide sus variaciones dos veces.
- **Sin cache negativa**: un código mal impreso, escaneado tres veces, recorre el catálogo tres veces.
- **Cache frontend solo con SKU del padre** (`coincidenciasEscaneoLocales`): las variaciones **siempre** van al servidor.
- **Payload completo**: se traen todos los campos de Woo (descripciones, imágenes, metadatos) para comparar un SKU.

---

## 3. Hallazgo clave

WooCommerce ya resuelve esto en **una sola petición**:

```
GET /wp-json/wc/v3/products?sku=<codigo>
```

Cuando se envía el parámetro `sku`, el controlador de productos de Woo fuerza
`post_type = ['product', 'product_variation']` y resuelve contra la tabla indexada
`wc_product_meta_lookup`. Es decir: **devuelve también variaciones**, sin recorrer padres.

La respuesta trae `id`, `type` y `parent_id`, que es todo lo necesario para decidir el resultado.

---

## 4. Alcance

### Incluye

- Nueva estrategia de resolución en backend: lookup nativo por SKU + fallbacks.
- Mejoras de cache: stale-while-revalidate, cache de variaciones con TTL, cache negativa, precalentado.
- Índice de SKU (incluyendo variaciones) disponible para el frontend, para resolución local instantánea.
- Instrumentación de tiempos por fase del escaneo.

### No incluye

- Cambiar el identificador de escaneo (sigue siendo el **SKU** de Woo, no un campo `barcode` aparte).
- Cambios en la UI del POS más allá del feedback ya existente.
- Migrar el catálogo completo a MySQL.

---

## 5. Solución propuesta (por niveles)

Los niveles son incrementales e independientes: cada uno se puede entregar y medir por separado.

### Nivel 0 — Medir antes de optimizar

- Header de respuesta `X-Scan-Ms` y log estructurado con: `codigo`, `resultado`, `msTotal`,
  `msListado`, `msVariaciones`, `peticionesWoo`, `origen` (`lookup` | `cache` | `barrido`).
- Sin esto no se puede demostrar la mejora ni detectar regresiones.

### Nivel 1 — Lookup nativo por SKU (mayor impacto, cambio contenido)

Nuevo orden en `findProductByScanCode`:

1. **Cache/índice en memoria** (SKU → `{productId, variationId, tipo}`). Si hay hit, resolver directo.
2. **`GET /products?sku=<codigo>&_fields=id,type,parent_id,sku`** — 1 petición.
   - `parent_id === 0` y `type` simple → resultado `simple`.
   - `parent_id === 0` y `type` variable → resultado `variable_sin_elegir`.
   - `parent_id > 0` → es variación: se resuelve el padre desde la lista cacheada y la variación
     con `GET /products/{parent_id}/variations/{id}` (1 petición extra, en paralelo con el padre si no está en cache).
3. **Barrido actual como fallback** solo si el lookup falla o devuelve vacío
   (protege instalaciones sin `wc_product_meta_lookup` poblada, SKUs guardados solo en `meta_data._sku`,
   o versiones antiguas de Woo).

Resultado: de **hasta V peticiones** a **1–2 peticiones**.

### Nivel 2 — Cache que no castiga al cajero

- **Stale-while-revalidate** en `getCachedProductList`: si la cache expiró, se devuelve la copia vieja
  y se refresca en segundo plano. El escaneo nunca espera al listado.
- **Precalentado al arranque** del servidor (`fetchProducts` + índice de SKU) para que el primer
  escaneo del día ya esté caliente.
- **Cache de variaciones a nivel módulo** con TTL (hoy es por request): escanear varias variaciones
  del mismo padre cuesta una sola petición.
- **Cache negativa** de códigos no encontrados con TTL corto (~15 s): evita repetir el barrido
  cuando el cajero vuelve a escanear una etiqueta ilegible.
- Invalidación: mantener la de `POST /orden` y añadirla en `POST /barcode/sync-product`
  (que hoy cambia el SKU en Woo y deja la cache desactualizada).

### Nivel 3 — Índice persistente de SKU en MySQL (opcional, si Niveles 1–2 no bastan)

Tabla nueva en `backend/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS sku_index (
  sku          VARCHAR(120) NOT NULL,
  product_id   INT NOT NULL,
  variation_id INT NULL,
  tipo         ENUM('simple','variacion','variable') NOT NULL,
  nombre       VARCHAR(500) NOT NULL DEFAULT '',
  updated_at   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sku),
  INDEX idx_sku_index_product (product_id)
);
```

- Se puebla con un job en background (al arranque y cada N minutos) y **de forma inmediata**
  en `POST /barcode/sync-product`, que es justo donde el POS asigna el código impreso al SKU.
- El lookup pasa a ser una consulta indexada en MySQL: **milisegundos, sin salir a WooCommerce**.
- Woo sigue siendo la fuente de verdad: el índice solo resuelve `codigo → ids`; precio y stock
  se leen de la cache de productos / Woo como hoy.

### Nivel 4 — Resolución local en el frontend

- Nuevo `GET /api/productos/escaneo/indice` que devuelve un arreglo compacto
  `[{ s: sku, p: productId, v: variationId|null, t: tipo }]` (solo 4 campos, sin nombres ni imágenes).
- El store `productos.js` lo guarda en `localStorage` junto al catálogo y
  `coincidenciasEscaneoLocales` pasa a resolver **también variaciones** sin tocar la red.
- El detalle (precio, stock, atributos) se pide en paralelo mientras la UI ya dio el beep y el feedback.
- Con esto se cumple el objetivo original de la spec del lector: **< 100 ms percibidos**.

### Nivel 5 — Ajustes menores

- `_fields` en las peticiones de lookup e índice: menos JSON transferido y parseado.
- Agente HTTP explícito con `keepAlive: true` y `maxSockets` en `wooClient` (evita handshake TLS
  por petición si el runtime de producción no es Node ≥ 19).
- `NARIPOS_VARIATION_FETCH_CONCURRENCY` sigue configurable, pero deja de ser el camino normal
  (subirlo puede saturar el WordPress de Hostinger; no es la palanca correcta).
- Una vez estable el Nivel 1, bajar los timeouts de 120 s a valores sanos (~15–20 s):
  hoy un fallo tarda dos minutos en avisar al cajero.

---

## 6. Contrato de API

`GET /api/productos/escaneo?q=<codigo>` **no cambia** su respuesta:

```json
{ "resultado": "simple|variacion|variable_sin_elegir", "producto": {}, "variacion": {}, "sinStock": false }
```

Nuevo endpoint (Nivel 4):

`GET /api/productos/escaneo/indice` → `{ "generadoEn": "ISO", "items": [{ "s": "...", "p": 1, "v": 2, "t": "variacion" }] }`

---

## 7. Criterios de aceptación

1. Escanear el SKU de una variación resuelve en **≤ 2 peticiones a WooCommerce** (verificable en el log del Nivel 0).
2. Los tests existentes de `backend/tests/productScan.test.js` siguen pasando sin cambios de comportamiento:
   simple, variación, `variable-subscription`, `meta_data._sku`, código inexistente.
3. Si el lookup nativo por SKU falla (error HTTP o respuesta vacía), el barrido actual sigue resolviendo:
   **ninguna regresión funcional**.
4. Un código inexistente escaneado dos veces seguidas no repite el barrido completo.
5. La expiración de la cache de 120 s no bloquea ningún escaneo.

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| `?sku=` no devuelve variaciones en la instalación de Woo del cliente | Fallback al barrido actual; se detecta en el log del Nivel 0 |
| SKU guardado solo en `meta_data._sku` y no en la columna indexada | El fallback lo cubre, igual que hoy |
| Cache stale muestra precio/stock desactualizado | TTL corto + invalidación en `POST /orden` y `sync-product` (ya existente) |
| Índice MySQL desincronizado | Es solo un atajo `codigo → ids`; ante miss se cae al lookup de Woo |

---

## 9. Recomendación

Implementar **Nivel 0 + Nivel 1 + Nivel 2** como primera entrega: son cambios acotados a
`backend/src/utils/productScan.js` y `backend/src/services/wooClient.js`, sin cambios de esquema,
sin cambios de UI y sin cambios de contrato. Medir con los datos reales del comercio y solo entonces
decidir si hacen falta los Niveles 3 y 4.
