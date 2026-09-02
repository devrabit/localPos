# 📋 Listado de productos sin SKU (módulo códigos de barras)

---

## 1. 🎯 Objetivo

Dado que existe el módulo de generación de códigos de barras, el usuario debe poder acceder desde esa pantalla a un **listado de productos y variaciones que aún no tienen SKU**, para asignarles un código de barras de forma guiada.

El escaneo en POS resuelve productos por **SKU** (campo `sku` o `meta_data._sku` en WooCommerce). Sin SKU, el producto no es localizable con lector de barras.

---

## 2. 🧱 Alcance

### Incluye

* Botón **Sin SKU** en la pantalla `/codigos-barras`
* Vista dedicada `/codigos-barras/sin-sku`
* API backend que consulta WooCommerce y devuelve ítems sin SKU
* Productos **simples** sin SKU
* **Variaciones** sin SKU (productos variables)
* Producto **variable (padre)** sin SKU, cuando aplica
* Navegación al generador con producto/variación preseleccionado
* Guardar SKU en variación vía `POST /api/barcode/sync-product` con `variationId`

### No incluye (MVP)

* Generación masiva de códigos en lote desde el listado
* Filtros avanzados (categoría, stock, fecha)
* Paginación server-side (catálogos muy grandes se listan completos en una respuesta)

---

## 3. 📊 Modelo de datos

### Ítem del listado (`SinSkuItem`)

```json
{
  "productId": 10,
  "variationId": 101,
  "nombre": "Camiseta — M",
  "tipo": "simple | variacion | variable",
  "precio": 20.0,
  "stock": 5
}
```

| Campo         | Descripción                                              |
| ------------- | -------------------------------------------------------- |
| `productId`   | ID del producto padre en WooCommerce                     |
| `variationId` | `null` para simple/padre; ID de variación si aplica  |
| `nombre`      | Nombre legible (variación incluye atributos)             |
| `tipo`        | `simple`, `variacion` o `variable` (padre)               |
| `precio`      | Precio numérico                                          |
| `stock`       | Cantidad; `-1` = stock ilimitado                         |

### Respuesta API

```json
{
  "items": [ /* SinSkuItem[] */ ],
  "total": 42
}
```

---

## 4. 🔌 API

### GET `/api/productos/sin-sku`

**Descripción:** Devuelve todos los productos y variaciones sin SKU.

**Lógica:**

1. Obtener catálogo Woo (`fetchProducts`)
2. Para cada producto **simple**: incluir si `sku` y `meta_data._sku` están vacíos
3. Para cada producto **variable** (`variable`, `variable-subscription`, etc.):
   * Cargar variaciones (`fetchProductVariations`)
   * Incluir cada variación sin SKU
   * Si el padre tampoco tiene SKU, incluir fila `tipo: variable`
4. Ordenar por `nombre` (locale `es`)

**Concurrencia:** reutilizar `NARIPOS_VARIATION_FETCH_CONCURRENCY` (default 8) para no saturar Woo.

**Response 200:**

```json
{
  "items": [
    {
      "productId": 1,
      "variationId": null,
      "nombre": "Producto sin codigo",
      "tipo": "simple",
      "precio": 5,
      "stock": 2
    }
  ],
  "total": 1
}
```

### POST `/api/barcode/sync-product` (extensión)

Body existente + campo opcional:

```json
{
  "productId": 10,
  "variationId": 101,
  "barcode": "VAR-101",
  "type": "CODE128"
}
```

* Sin `variationId` → actualiza SKU del producto padre
* Con `variationId` → actualiza SKU de la variación (`PUT /products/{id}/variations/{variationId}`)

---

## 5. 🖥️ UI/UX

### Pantalla `/codigos-barras`

* Nuevo botón **Sin SKU** en el encabezado (junto a Volver al POS / Historial)
* Destino: `/codigos-barras/sin-sku`

### Pantalla `/codigos-barras/sin-sku`

| Elemento              | Comportamiento                                      |
| --------------------- | --------------------------------------------------- |
| Título                | "Productos sin SKU"                                 |
| Contador              | "N de total sin SKU"                                |
| Búsqueda              | Filtra por nombre, `productId` o `variationId`      |
| Lista                 | Una fila por ítem pendiente                         |
| Badge tipo            | Simple / Variación / Variable (padre)               |
| Botón Generar código  | Navega a `/codigos-barras?productId=X&variationId=Y` |
| Actualizar            | Recarga el listado desde la API                     |
| Volver a códigos      | Link a `/codigos-barras`                            |

### Pantalla `/codigos-barras` (preselección)

Al llegar con query params:

* `productId` → selecciona el producto padre
* `variationId` (opcional) → carga variación y prellena el texto del código con el ID de variación si no hay SKU

---

## 6. 🔄 Flujos de usuario

### Caso 1: Asignar código a variación sin SKU

1. Usuario entra a **Códigos de barras**
2. Pulsa **Sin SKU**
3. Ve "Camiseta — M" (variación)
4. Pulsa **Generar código**
5. Se abre el generador con la variación seleccionada
6. Genera código, imprime y **Guardar número en SKU (Woo)**

### Caso 2: Producto simple sin SKU

1. Mismo flujo; sin `variationId` en la URL
2. Sync guarda SKU en el producto padre

### Caso 3: Catálogo completo

1. Si todos tienen SKU → mensaje: "Todos los productos y variaciones tienen SKU asignado."

---

## 7. ⚠️ Validaciones y reglas

* Un ítem **no** aparece en el listado si tiene SKU en campo `sku` **o** en `meta_data._sku`
* Productos con SKU no se mezclan en el listado aunque tengan variaciones sin SKU (cada variación se evalúa por separado)
* El padre variable sin SKU aparece como fila adicional (útil para escaneo por SKU de padre)

---

## 8. 🧪 Criterios de aceptación (MVP)

- [ ] Existe botón **Sin SKU** en `/codigos-barras`
- [ ] La ruta `/codigos-barras/sin-sku` muestra productos simples sin SKU
- [ ] La ruta muestra variaciones sin SKU de productos variables
- [ ] Búsqueda local filtra el listado
- [ ] **Generar código** redirige con `productId` / `variationId` correctos
- [ ] El generador preselecciona el ítem elegido
- [ ] Sync con `variationId` guarda SKU en la variación en Woo
- [ ] Tests backend para endpoint y utilidad `findProductsWithoutSku`

---

## 9. 🔗 Relación con otros módulos

| Módulo                    | Relación                                                |
| ------------------------- | ------------------------------------------------------- |
| `impresionCodigoDeBarrasSpec.md` | Pantalla base de generación e impresión           |
| `lectorCodigoDeBarrasSpec`       | Escaneo resuelve por SKU; este listado cubre el hueco |
| `cambiosPosSpec.md`              | Modelo de variaciones compartido                      |

---

## 10. 📁 Archivos previstos

| Capa     | Archivo |
| -------- | ------- |
| Spec     | `specs/productosSinSkuSpec.md` |
| Backend  | `backend/src/utils/productsWithoutSku.js` |
| Backend  | `backend/src/routes/api.js` (ruta `GET /productos/sin-sku`) |
| Backend  | `backend/src/routes/barcode.js` (`variationId` en sync) |
| Backend  | `backend/src/services/wooClient.js` (`updateVariationSku`) |
| Frontend | `frontend/src/views/ProductosSinSkuView.vue` |
| Frontend | `frontend/src/views/BarcodeView.vue` (botón + query params) |
| Frontend | `frontend/src/router/index.js` |
| Tests    | `backend/tests/productsWithoutSku.test.js`, `api.test.js`, `barcode.test.js` |
