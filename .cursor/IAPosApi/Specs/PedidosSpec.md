# SPEC: Módulo Pedidos (POS)

## Objetivo

Crear un módulo de **Pedidos** accesible desde el menú del POS para listar pedidos existentes, crear nuevos pedidos con ítems, **editar un pedido ya guardado desde el visor/detalle**, persistencia en MySQL y descarga de PDF tras generar o actualizar.

## Regla crítica de persistencia

- Los pedidos **solo** se guardan en la **base de datos MySQL** del POS (Hostinger).
- **No** se deben crear, actualizar ni sincronizar pedidos (ni orders) en **WordPress / WooCommerce**.
- El módulo es interno del POS; WooCommerce queda fuera del flujo de alta, listado, edición, estado y PDF.
- Este módulo **no** usa `wooClient`. Las rutas `/api/ordenes` (órdenes WooCommerce) son independientes; no confundir con `/api/pedidos`.

---

## Acceso

- Enlace **Pedidos** en el encabezado del POS (junto a Historial, Salidas, Agotados, Anotaciones).
- Rutas:
  - `/pedidos` — listado
  - `/pedidos/nuevo` — formulario de alta
  - `/pedidos/:id` — detalle / visor (ver ítems, estado, PDF, acceso a editar)
  - `/pedidos/:id/editar` — formulario de edición (mismo patrón de ítems que el alta)

---

## Estados del pedido

Valores fijos (códigos canónicos compartidos):

| Código interno           | Etiqueta UI              |
|--------------------------|--------------------------|
| `en_proceso`             | En proceso               |
| `enviado_al_proveedor`   | Enviado al proveedor     |
| `recibido`               | Recibido                 |
| `subido_al_sitio`        | Subido al sitio          |

- Al **crear** un pedido, estado inicial: **En proceso** (`en_proceso`).
- Frontend: `pedidoEstados.js`. Backend: ENUM MySQL + misma lista en Zod / `pedidosStorage.ESTADOS`. Cualquier cambio debe actualizar ambos.
- El listado y el detalle muestran el estado con la etiqueta UI.
- Cambio de estado (select en detalle): permitido entre los 4 valores. Sin automatización WooCommerce.
- La **edición** de dirigido a / ítems **no** cambia el estado (el estado se gestiona solo en el detalle).

---

## Caso 1 — Listado de pedidos

### Dado

Existe más de un pedido (o cero / uno; la UI debe manejarlos).

### Entonces

- Tabla con columnas mínimas:
  - Fecha / hora de creación
  - Dirigido a
  - Ítems: muestra `itemCount` y entre paréntesis el total de unidades (`unidades`), p. ej. `3 (12 u.)`
  - Estado
  - Acciones (ver detalle)
- Orden: **más reciente → más antiguo** (`fecha_creacion DESC`).
- Paginación **server-side** obligatoria: `GET /api/pedidos?page=1&limit=20` (limit máx. 100).
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
2. Respuesta con el pedido creado (ver contrato de respuesta).
3. UI: éxito + botón **Descargar PDF**.
4. El PDF incluye: imagen de encabezado (Nari Universe), título Pedido, **id**, fecha, dirigido a, tabla de ítems (nombre, referencia, cantidad, descripción). **No** incluye el campo estado.

---

## Caso 3 — Editar pedido (desde el visor)

### Dado

El usuario está en el **detalle / visor** de un pedido existente (`/pedidos/:id`).

### Entonces

- Botón **Editar pedido** visible en el detalle (junto a Descargar PDF / controles de estado).
- Click → navega a `/pedidos/:id/editar`.
- El formulario se precarga con:
  - **Dirigido a** actual
  - Lista de ítems actuales (nombre, referencia, cantidad, descripción)
- Reutiliza el **mismo patrón UI** del alta (sección dinámica + listado CRUD local de ítems).
- Campos **editables**:
  - Dirigido a
  - Ítems: agregar, editar fila, eliminar
- Campos **no editables** en esta pantalla:
  - `id`
  - `fechaCreacion` (se muestra solo lectura)
  - `estado` (se cambia solo en el detalle)
- Validación al guardar: igual que el alta (≥ 1 ítem, dirigido a no vacío, cantidad ≥ 1).
- Click **Guardar cambios** → `PUT /api/pedidos/:id` → reemplaza dirigido a + conjunto completo de ítems en MySQL (transacción).
- Tras éxito:
  - Feedback de confirmación
  - Botón **Descargar PDF** (con los datos actualizados)
  - Navegación o enlace de vuelta al detalle `/pedidos/:id`
- Si el pedido no existe → 404 y mensaje en UI.
- **No** se borra el pedido completo en v1 (sin soft/hard delete).

### Estrategia de persistencia de ítems

Al guardar la edición:

1. Actualizar `dirigido_a` del pedido.
2. **Reemplazar ítems**: borrar los `pedido_items` del pedido e insertar el nuevo conjunto (en la misma transacción).
3. No se exige conservar los `id` de ítems previos (los ítems nuevos reciben UUID nuevos).
4. El `estado` y `fecha_creacion` **no** se modifican.

### Fuera de esta edición

- No cambia el estado.
- No crea un pedido nuevo (mismo `id`).
- No escribe en WooCommerce.

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
- `cantidad` INT NOT NULL (validación app ≥ 1 vía Zod; CHECK opcional en migraciones futuras)
- `descripcion` TEXT NULL
- INDEX por `pedido_id`

**Orden de ítems en detalle/PDF:** por `nombre_producto ASC` (comportamiento actual).

---

## API (Backend)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/pedidos?page=&limit=` | Listado paginado, orden reciente→antiguo |
| `GET` | `/api/pedidos/:id` | Detalle con ítems |
| `POST` | `/api/pedidos` | Crear pedido + ítems |
| `PUT` | `/api/pedidos/:id` | **Editar** dirigido a + ítems (reemplazo completo) |
| `PATCH` | `/api/pedidos/:id` | Actualizar **solo** estado (obligatorio en v1) |

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

### `PUT /api/pedidos/:id` body

Mismo shape que el create (sin `estado`):

```json
{
  "dirigidoA": "Proveedor X actualizado",
  "items": [
    {
      "nombreProducto": "Producto A",
      "referencia": "REF-01",
      "cantidad": 3,
      "descripcion": "opcional"
    }
  ]
}
```

- 404 si el `id` no existe.
- 400 si validación falla (Zod: dirigido a, ≥ 1 ítem, cantidad ≥ 1).
- Respuesta: pedido completo actualizado (mismo shape que GET detalle).

### `PATCH /api/pedidos/:id` body

```json
{ "estado": "enviado_al_proveedor" }
```

Solo cambia estado; no edita ítems ni dirigido a.

### Respuesta listado

```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "pedidos": [ /* resumen sin items o con itemCount/unidades */ ]
}
```

### Respuesta create / get / put / patch (detalle)

```json
{
  "id": "uuid",
  "dirigidoA": "Proveedor X",
  "estado": "en_proceso",
  "fechaCreacion": "2026-09-16T12:00:00.000Z",
  "itemCount": 2,
  "unidades": 5,
  "items": [
    {
      "id": "uuid-item",
      "nombreProducto": "Producto A",
      "referencia": "REF-01",
      "cantidad": 2,
      "descripcion": ""
    }
  ]
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
    PedidoEditarView.vue      # nuevo
  store/
    pedidosStore.js
  services/
    pedidosService.js         # + updatePedido(id, payload)
  pedidoEstados.js
  utils/
    pedidoPdf.js
```

Asset: `frontend/public/pedido-header.png`.

Stack: Vue 3 + Pinia + Tailwind + Axios (mismo patrón que anotaciones / historial).

### UI del detalle (visor)

Además de lo existente (estado + PDF):

- Botón **Editar pedido** → `/pedidos/:id/editar`.

### UI de edición

- Reutilizar la lógica visual del formulario de alta (dirigido a + sección ítem + CRUD local).
- Título: **Editar pedido**.
- Mostrar `id` y fecha en solo lectura.
- Botones: **Guardar cambios**, **Cancelar** (vuelve al detalle sin guardar), y tras éxito **Descargar PDF**.

---

## PDF

- Generación **en el cliente** tras guardar (alta o edición) y desde detalle, sin endpoint PDF obligatorio en v1.
- **Sin `window.open`:** usar impresión vía iframe oculto (mismo patrón que facturas / `printHtmlInIframe`).
- Campos del PDF: encabezado Nari Universe (`/pedido-header.png`), título «Pedido», **id**, fecha, dirigido a, tabla de ítems. **Excluir estado.**
- El usuario elige “Guardar como PDF” en el diálogo de impresión del sistema.
- Tras editar, el PDF debe reflejar los datos **actualizados**.

---

## Fuera de alcance (v1 + edición)

- Cualquier escritura o lectura de pedidos hacia/desde **WordPress / WooCommerce** (incluye REST `/orders`, webhooks, plugins).
- Sincronización automática con WooCommerce al pasar a “Subido al sitio” (el estado es solo etiqueta interna en MySQL).
- Borrar un pedido completo (DELETE).
- Edición parcial de un solo ítem vía endpoint dedicado (la edición es reemplazo completo del conjunto).
- Multi-usuario / permisos / bloqueo optimista.
- Notificaciones al proveedor.
- Adjuntar archivos al pedido.
- Cambiar `fecha_creacion` o `id`.

---

## Criterios de aceptación

1. Enlace **Pedidos** visible en el menú del POS y navega a `/pedidos`.
2. Listado ordenado del más reciente al más antiguo, con paginación server-side.
3. Tabla muestra al menos fecha, dirigido a, ítems (`N (M u.)`), estado.
4. Botón **Agregar pedido** abre el formulario.
5. Formulario con **Dirigido a** + sección dinámica + listado CRUD de ítems.
6. **Generar pedido** persiste en MySQL y deja disponible **Descargar PDF**.
7. Estado inicial **En proceso**; los 4 estados son representables en UI.
8. Sin ítems o sin dirigido a → no se guarda; feedback de validación.
9. Mobile-friendly (POS).
10. Generar/listar/actualizar pedidos **no** llama a la API de WordPress/WooCommerce; solo MySQL.
11. Desde el **visor/detalle**, existe **Editar pedido** y navega a `/pedidos/:id/editar`.
12. El formulario de edición precarga dirigido a + ítems existentes.
13. Se pueden agregar, modificar y eliminar ítems antes de guardar.
14. **Guardar cambios** persiste vía `PUT /api/pedidos/:id` sin alterar `estado` ni `fechaCreacion`.
15. Tras editar, el PDF muestra los datos actualizados.
16. Cancelar vuelve al detalle sin persistir cambios.
17. Pedido inexistente en edición → error claro (404).
