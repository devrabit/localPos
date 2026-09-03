# 📄 SPEC: Popup para asignar SKU desde el listado de productos sin SKU

## 1. 🎯 Objetivo

Hoy el botón **Generar codigo** del listado `/codigos-barras/sin-sku` **navega** a `/codigos-barras` con el producto preseleccionado. El usuario pierde el contexto del listado y debe volver atrás por cada producto.

Nuevo comportamiento: al hacer clic en **Generar codigo** se abre un **popup (modal)** con un formulario para **asignar el SKU** al producto o variación, sin salir del listado.

**Beneficio:** asignar SKU en lote es mucho más rápido: el usuario recorre la lista, asigna, y la fila desaparece.

---

## 2. 🧱 Alcance

### Incluye

* Modal con formulario de SKU sobre el listado sin SKU
* Sugerencia automática de SKU al abrir
* Vista previa del código de barras en tiempo real
* Validación de CODE128 y EAN13 antes de guardar
* Guardado en WooCommerce (producto **o** variación)
* Actualización del listado tras guardar (la fila asignada desaparece)
* Enlace secundario a la pantalla completa de códigos para imprimir

### No incluye (MVP)

* Impresión de etiquetas dentro del modal (sigue en `/codigos-barras`)
* Asignación masiva automática de varias filas a la vez
* Edición de otros campos del producto (precio, stock, nombre)

---

## 3. 🔄 Flujo de usuario

### Caso 1: Asignar SKU a un producto simple

1. Usuario está en `/codigos-barras/sin-sku`
2. Pulsa **Generar codigo** en la fila "Producto 004"
3. Se abre el modal con:
   * Título: nombre del producto
   * Campo **SKU** precargado con la sugerencia (`4`)
   * Selector de tipo (CODE128 por defecto)
   * Vista previa del código
4. Ajusta el SKU si quiere y pulsa **Guardar SKU**
5. Modal muestra éxito, se cierra y la fila **desaparece** del listado
6. El contador de la página se actualiza

### Caso 2: Asignar SKU a una variación

Idéntico, pero:
* El título muestra el nombre con atributos ("Producto 003 — S")
* La sugerencia usa el `variationId`
* Se envía `variationId` al backend

### Caso 3: Error de validación

1. Usuario elige **EAN13** y escribe `123`
2. Al perder foco / al guardar, aparece el error: *"EAN13 requiere 12 o 13 digitos"*
3. El botón **Guardar SKU** queda deshabilitado hasta corregir

### Caso 4: Error de WooCommerce

1. Woo rechaza el SKU (p. ej. duplicado)
2. El modal **permanece abierto** mostrando el mensaje de error del servidor
3. El usuario puede corregir y reintentar sin perder lo escrito

---

## 4. 🖥️ UI del modal

### Estructura

| Zona | Contenido |
| ---- | --------- |
| Encabezado | Nombre del ítem + badge de tipo (Simple / Variacion / Variable) + IDs |
| Cuerpo | Campo SKU, selector de tipo, vista previa, mensajes |
| Pie | **Cancelar** · **Guardar SKU** · enlace *"Abrir en códigos de barras"* |

### Campos del formulario

| Campo | Tipo | Default | Validación |
| ----- | ---- | ------- | ---------- |
| SKU | texto | Sugerencia automática | No vacío; reglas por tipo |
| Tipo | select | `CODE128` | `CODE128` \| `EAN13` |

### Sugerencia automática de SKU

Al abrir el modal, el campo SKU se precarga con:

1. El `variationId` si la fila es una variación
2. El `productId` si es producto simple o padre variable

El usuario **siempre puede editarlo**. Es una sugerencia, no una imposición.

### Vista previa

* Se renderiza con **JsBarcode** (misma librería que `BarcodeView`)
* Se actualiza al escribir (reactiva a SKU y tipo)
* Si el texto es inválido para el tipo elegido, se muestra el mensaje de error en lugar de la imagen

### Comportamiento del modal

* Cierra con **Cancelar**, tecla **Escape** o clic en el fondo
* **No** cierra al hacer clic dentro del panel
* Mientras guarda: botones deshabilitados y texto *"Guardando…"*
* El input de SKU recibe **foco automático** al abrir
* El modal lleva `data-no-barcode-scan` para que el lector no interfiera al escribir

---

## 5. ✅ Validación (cliente y servidor)

La validación del cliente **replica** las reglas del backend (`backend/src/utils/barcodeValidation.js`), pero el servidor sigue siendo la autoridad.

### CODE128

* No vacío
* Máximo 80 caracteres
* Solo ASCII imprimible (32–126)

### EAN13

* 12 dígitos → se completa el dígito de control automáticamente
* 13 dígitos → se verifica el dígito de control
* Otro largo → *"EAN13 requiere 12 o 13 digitos"*
* Checksum incorrecto → *"Digito de control EAN13 invalido"*

---

## 6. 🔌 API

**No requiere endpoints nuevos.** Se reutiliza el existente:

### POST `/api/barcode/sync-product`

```json
{
  "productId": 3,
  "variationId": 300,
  "barcode": "300",
  "type": "CODE128"
}
```

* Sin `variationId` → actualiza el SKU del producto padre
* Con `variationId` → actualiza el SKU de la variación
* Ya invalida las caches de escaneo y de listado sin SKU

**Response 200:**

```json
{ "ok": true, "productId": 3, "variationId": 300, "sku": "300", "barcode": "300" }
```

**Errores:** `400` texto inválido · `501` sincronización no disponible · `5xx` fallo de Woo

---

## 7. 🔁 Actualización del listado tras guardar

Al recibir `ok: true`:

1. Se elimina la fila del array local (feedback inmediato, sin esperar red)
2. Se muestra un aviso temporal: *"SKU asignado a {nombre}"*
3. **No** se recarga la página completa: el usuario sigue en la misma posición

Si al quitar la fila la página queda vacía y existen más páginas, se recarga la página actual para traer datos frescos del servidor.

---

## 8. ♿ Accesibilidad

* `role="dialog"` y `aria-modal="true"`
* Título del modal referenciado con `aria-labelledby`
* Mensajes de error con `role="alert"`
* Botones con altura mínima de 48 px (uso táctil, coherente con el POS)
* Cierre con **Escape**

---

## 9. 🧪 Criterios de aceptación

- [ ] Clic en **Generar codigo** abre un modal y **no** navega a otra ruta
- [ ] El modal muestra nombre, tipo e IDs del ítem elegido
- [ ] El campo SKU se precarga con la sugerencia (`variationId` o `productId`)
- [ ] La vista previa del código se actualiza al escribir
- [ ] EAN13 con menos de 12 dígitos muestra error y bloquea el guardado
- [ ] EAN13 con 12 dígitos se guarda con el dígito de control calculado
- [ ] Guardar envía `variationId` solo cuando la fila es una variación
- [ ] Tras guardar con éxito, la fila desaparece del listado
- [ ] Un error de Woo mantiene el modal abierto con el mensaje visible
- [ ] El modal cierra con Cancelar, Escape y clic en el fondo
- [ ] Existe enlace a `/codigos-barras` para imprimir la etiqueta
- [ ] El lector de códigos de barras no interfiere con el input del modal

---

## 10. ⚠️ Riesgos y decisiones

| Tema | Decisión |
| ---- | -------- |
| SKU duplicado en Woo | No se valida en el cliente; se muestra el error que devuelve Woo |
| Impresión | Fuera del modal; el enlace lleva a `/codigos-barras` con el ítem preseleccionado |
| Pérdida del flujo anterior | Se conserva la ruta `/codigos-barras?productId=…&variationId=…`, ahora accesible desde el enlace del modal |
| Doble envío | El botón se deshabilita mientras la petición está en curso |

---

## 11. 📁 Archivos previstos

| Capa | Archivo |
| ---- | ------- |
| Spec | `.cursor/IAPosApi/Specs/sinSkuModalAsignarSkuSpec.md` |
| Frontend | `frontend/src/components/AsignarSkuModal.vue` (nuevo) |
| Frontend | `frontend/src/utils/barcodeValidation.js` (nuevo: validación compartida en cliente) |
| Frontend | `frontend/src/views/ProductosSinSkuView.vue` (abre el modal en vez de navegar) |
| Tests | `frontend/src/utils/barcodeValidation.test.js` (validación CODE128 / EAN13) |

Sin cambios en backend.

---

## 12. 🔗 Relación con otros módulos

| Módulo | Relación |
| ------ | -------- |
| `productosSinSkuSpec.md` | Define el listado donde vive el botón |
| `productosSinSkuPaginacionSpec.md` | La eliminación de filas debe respetar la paginación |
| `impresionCodigoDeBarrasSpec.md` | La impresión sigue en la pantalla completa |
