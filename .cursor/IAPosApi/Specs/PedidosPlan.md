# PLAN: Editar pedido desde el visor

## Skills

- `Skills/BackendNode.md`
- `Skills/FrontentVue.md`

## Base

- SPEC actualizado: `PedidosSpec.md` (Caso 3 — Editar pedido)
- Código existente: `pedidosStorage`, rutas `/api/pedidos`, `PedidoDetalleView`, `PedidoNuevoView`, `pedidoPdf.js`

---

## 1. Backend — storage

**Archivo:** `backend/src/services/pedidosStorage.js`

- Agregar `updatePedido(id, { dirigidoA, items })`:
  1. Verificar que el pedido exista; si no → `null`.
  2. Transacción:
     - `UPDATE pedidos SET dirigido_a = ? WHERE id = ?` (**sin** tocar `estado` ni `fecha_creacion`).
     - `DELETE FROM pedido_items WHERE pedido_id = ?`.
     - Insertar el nuevo conjunto de ítems (mismo mapping que `createPedido`).
  3. Commit → `return getPedido(id)`.
- Exportar `updatePedido`.

---

## 2. Backend — API

**Archivo:** `backend/src/routes/api.js`

- Reutilizar (o extrar) el schema Zod de create para el body del PUT
  (`dirigidoA` + `items` con las mismas reglas).
- `PUT /api/pedidos/:id`:
  - Parse body.
  - `pedidosStorage.updatePedido(...)`.
  - 404 si no existe.
  - 200 con el pedido actualizado.
- Mantener `PATCH /api/pedidos/:id` solo para estado (sin cambios de contrato).
- **Orden de rutas:** `PUT` y `PATCH` en `/:id` pueden coexistir; no hay conflicto con Express.

**Tests:** `backend/tests/api.test.js` (o archivo pedidos si se prefiere)

- Crear pedido → PUT con ítems cambiados → GET refleja cambios; estado y fecha intactos.
- PUT a id inexistente → 404.
- PUT sin ítems / dirigido vacío → 400.
- PATCH estado sigue funcionando.

---

## 3. Frontend — service / store

**`pedidosService.js`**

- `updatePedido(id, { dirigidoA, items })` → `api.put(/pedidos/${id}, ...)`.

**`pedidosStore.js`**

- Opcional: acción `actualizar`; el detalle/editar pueden llamar al service directo (como hoy con estado). Preferir service directo para no inflar el store si no hace falta.

---

## 4. Frontend — rutas y vistas

**`router/index.js`**

- Ruta `pedidos-editar`: `/pedidos/:id/editar` → `PedidoEditarView.vue`
  (declarar **antes** o con path más específico que no choque; con Vue Router 4 el path literal `/pedidos/:id/editar` es inequívoco frente a `/pedidos/:id`).

**`PedidoDetalleView.vue`**

- Botón **Editar pedido** → `router.push(/pedidos/${id}/editar)`.

**`PedidoEditarView.vue`** (nueva)

- Al montar: `GET /pedidos/:id` → precargar `dirigidoA` + `items` en refs locales (mismo modelo que Nuevo).
- Reutilizar el patrón UI de `PedidoNuevoView` (sección dinámica + CRUD).
- Mostrar `id` y `fechaCreacion` en solo lectura.
- **Guardar cambios** → PUT → éxito + PDF + link al detalle.
- **Cancelar** → volver a `/pedidos/:id` sin PUT.
- Errores: 404 / validación.

Opcional de implementación (si reduce duplicación): extraer un componente compartido
`PedidoFormItems.vue` usado por Nuevo y Editar. No es obligatorio si el duplicado es
pequeño; priorizar claridad.

---

## 5. PDF

- Sin cambios de util: tras PUT exitoso, llamar `descargarPedidoPdf(pedidoActualizado)`.
- Verificar que el PDF no incluye estado y sí refleja ítems nuevos.

---

## 6. Orden de ejecución

1. `updatePedido` en storage + tests unitarios/API.
2. Ruta `PUT /api/pedidos/:id`.
3. `pedidosService.updatePedido`.
4. `PedidoEditarView` + ruta router.
5. Botón en `PedidoDetalleView`.
6. QA manual.
7. Deploy / `dist` **solo si el usuario lo pide**.

---

## 7. QA manual

1. Detalle de un pedido existente → **Editar pedido**.
2. Cambiar dirigido a; agregar un ítem; editar otro; eliminar uno → Guardar.
3. Volver al detalle: datos actualizados; estado y fecha iguales.
4. Descargar PDF: refleja cambios; sin estado.
5. Cancelar sin guardar → detalle intacto.
6. Validación: vaciar ítems → no guarda.
7. URL con id inventado → mensaje 404.
8. Mobile ~390px.

---

## Impacto

- Backend: 1 método storage + 1 ruta PUT + tests.
- Frontend: 1 vista nueva, 1 botón en detalle, 1 método service, 1 ruta.
- Schema MySQL: **sin cambios**.
- WooCommerce: **sin uso**.
