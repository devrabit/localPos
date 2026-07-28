# SPEC: Módulo Pedidos (POS)

## Objetivo

Crear un módulo de **Pedidos** accesible desde el menú del POS para listar pedidos existentes y crear nuevos pedidos con ítems, persistencia en MySQL y descarga de PDF tras generar.

## Regla crítica de persistencia

- Los pedidos **solo** se guardan en la **base de datos MySQL** del POS (Hostinger).
- **No** se deben crear, actualizar ni sincronizar pedidos (ni orders) en **WordPress / WooCommerce**.
- El módulo es interno del POS; WooCommerce queda fuera del flujo de alta, listado, estado y PDF.

---

## Acceso

- Enlace **Pedidos** en el encabezado del POS (junto a Historial, Salidas, Agotados, Anotaciones).
- Rutas:
  - `/pedidos` — listado
  - `/pedidos/nuevo` — formulario de alta
  - `/pedidos/:id` — detalle (ver ítems, estado, re-descargar PDF)

---

## Estados del pedido

Valores fijos (ENUM / constante compartida):

| Código interno           | Etiqueta UI              |
|--------------------------|--------------------------|
| `en_proceso`             | En proceso               |
| `enviado_al_proveedor`   | Enviado al proveedor     |
| `recibido`               | Recibido                 |
| `subido_al_sitio`        | Subido al sitio          |

- Al **crear** un pedido, estado inicial: **En proceso** (`en_proceso`).
- El listado y el detalle muestran el estado con la etiqueta UI.
- Cambio de estado (select en detalle): permitido entre los 4 valores. Sin automatización WooCommerce en esta versión.

---

## Caso 1 — Listado de pedidos

### Dado

Existe más de un pedido (o cero / uno; la UI debe manejarlos).

### Entonces

- Tabla con columnas mínimas:
  - Fecha / hora de creación
  - Dirigido a
  - Cantidad de ítems (o total de unidades)
  - Estado
  - Acciones (ver detalle)
- Orden: **más reciente → más antiguo** (`fecha_creacion DESC`).
- **Paginación** server-side (recomendado) o client-side si el volumen es bajo; default `page=1`, `limit=20`.
- Estados vacíos: mensaje claro + CTA “Agregar pedido”.
- Botón **Agregar pedido** visible en el listado.

---

## Caso 2 — Agregar pedido

### Flujo

1. Click **Agregar pedido** → navega a `/pedidos/nuevo`.
2. Completar formulario.
3. Click **Generar pedido** → valida, guarda en DB, muestra confirmación y botón **Descargar PDF**.

### Campos del formulario

| Campo        | Tipo        | Obligatorio | Notas                                      |
|--------------|-------------|-------------|--------------------------------------------|
| Dirigido a   | texto       | Sí          | Destinatario / proveedor                   |

### Sección dinámica de ítem (alta / edición antes de agregar a la lista)

| Campo               | Tipo   | Obligatorio |
|---------------------|--------|-------------|
| Nombre del producto | texto  | Sí          |
| Referencia          | texto  | Sí          |
| Cantidad            | número | Sí (≥ 1)    |
| Descripción         | texto  | No          |

- Controles para **agregar** el ítem a la lista local (y limpiar la sección).
- En la parte baja: **listado CRUD** de productos del pedido:
  - Ver filas agregadas
  - Editar (cargar en la sección dinámica)
  - Eliminar
- No se puede **Generar pedido** sin al menos **1 ítem** y **Dirigido a** no vacío.

### Generar pedido

1. `POST` al backend → persiste cabecera + ítems en MySQL.
2. Respuesta con el pedido creado (`id`, datos, ítems, estado).
3. UI: éxito + botón **Descargar PDF**.
4. El PDF incluye: título Pedido, fecha, dirigido a, estado, tabla de ítems (nombre, referencia, cantidad, descripción).

---

## Persistencia (MySQL)

### `pedidos`

- `id` VARCHAR(36) PK (UUID)
- `dirigido_a` VARCHAR(255) NOT NULL
- `estado` ENUM(...) NOT NULL DEFAULT `'en_proceso'`
- `fecha_creacion` DATETIME(3) NOT NULL
- `created_at` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
- INDEX por `fecha_creacion DESC`

### `pedido_items`

- `id` VARCHAR(36) PK
- `pedido_id` VARCHAR(36) NOT NULL FK → `pedidos(id)` ON DELETE CASCADE
- `nombre_producto` VARCHAR(500) NOT NULL
- `referencia` VARCHAR(255) NOT NULL
- `cantidad` INT NOT NULL
- `descripcion` TEXT NULL
- INDEX por `pedido_id`

---

## API (Backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/pedidos?page=&limit=` | Listado paginado, orden reciente→antiguo |
| `GET` | `/api/pedidos/:id` | Detalle con ítems |
| `POST` | `/api/pedidos` | Crear pedido + ítems |
| `PATCH` | `/api/pedidos/:id` | Actualizar estado (opcional pero incluido) |

### `POST /api/pedidos` body

```json
{
  "dirigidoA": "Proveedor X",
  "items": [
    {
      "nombreProducto": "Producto A",
      "referencia": "REF-01",
      "cantidad": 2,
      "descripcion": "opcional"
    }
  ]
}
```

### Respuesta listado

```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "pedidos": [ /* ... */ ]
}
```

Validación con Zod. Errores 400 claros.

---

## Frontend (estructura)

```
modules/pedidos/
  views/
    PedidosListView.vue
    PedidoNuevoView.vue
    PedidoDetalleView.vue
  store/
    pedidosStore.js
  services/
    pedidosService.js
```

Stack: Vue 3 + Pinia + Tailwind + Axios (mismo patrón que anotaciones / historial).

---

## PDF

- Generación **en el cliente** tras guardar (y desde detalle), sin endpoint PDF obligatorio en v1.
- **Sin `window.open`:** usar impresión vía iframe oculto (mismo patrón que facturas / `printHtmlInIframe`), para no depender de popups del navegador.
- El usuario elige “Guardar como PDF” en el diálogo de impresión del sistema.

---

## Fuera de alcance (v1)

- Cualquier escritura o lectura de pedidos hacia/desde **WordPress / WooCommerce** (incluye REST `/orders`, webhooks, plugins).
- Sincronización automática con WooCommerce al pasar a “Subido al sitio” (el estado es solo etiqueta interna en MySQL).
- Edición de ítems de un pedido ya guardado (solo crear + ver + cambiar estado).
- Multi-usuario / permisos.
- Notificaciones al proveedor.
- Adjuntar archivos al pedido.

---

## Criterios de aceptación

1. Enlace **Pedidos** visible en el menú del POS y navega a `/pedidos`.
2. Listado ordenado del más reciente al más antiguo, con paginación.
3. Tabla muestra al menos fecha, dirigido a, estado.
4. Botón **Agregar pedido** abre el formulario.
5. Formulario con **Dirigido a** + sección dinámica + listado CRUD de ítems.
6. **Generar pedido** persiste en MySQL y deja disponible **Descargar PDF**.
7. Estado inicial **En proceso**; los 4 estados son representables en UI.
8. Sin ítems o sin dirigido a → no se guarda; feedback de validación.
9. Mobile-friendly (POS).
10. Generar/listar/actualizar pedidos **no** llama a la API de WordPress/WooCommerce; solo MySQL.
