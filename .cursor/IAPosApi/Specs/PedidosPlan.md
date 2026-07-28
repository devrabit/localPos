# PLAN: Módulo Pedidos (POS)

## Skills

- `Skills/BackendNode.md`
- `Skills/FrontentVue.md`

## Base

- SPEC: `PedidosSpec.md`
- Patrones: `anotaciones` (módulo + MySQL), menú en `PosView.vue`, `schema.sql` + `db:init`

---

## 1. Base de datos

**Archivo:** `backend/db/schema.sql`

- Agregar tablas `pedidos` y `pedido_items` según SPEC.
- Ejecutar / documentar: `npm run db:init` en backend (o migración SQL manual en Hostinger).

**Storage:** `backend/src/services/pedidosStorage.js`

- `listPedidos({ page, limit })` → `{ total, pedidos }` orden `fecha_creacion DESC`
- `getPedido(id)` → cabecera + ítems
- `createPedido({ dirigidoA, items })` → UUID, estado `en_proceso`, insert transaccional
- `updatePedidoEstado(id, estado)` → valida ENUM

---

## 2. API

**Archivo:** `backend/src/routes/api.js` (o router dedicado montado igual)

- Schemas Zod para query listado, body create, body patch estado.
- Rutas del SPEC.
- Mapear camelCase API ↔ snake_case DB.

**Tests (opcional pero útil):** smoke con storage en memoria o skip si no hay DB en CI.

---

## 3. Frontend — módulo

### Rutas (`frontend/src/router/index.js`)

- `pedidos` → `PedidosListView`
- `pedidos-nuevo` → `PedidoNuevoView`
- `pedidos-detalle` → `PedidoDetalleView`

### Menú (`PosView.vue`)

- `router-link` **Pedidos** → `/pedidos`

### `pedidosService.js`

- Wrappers axios: `list`, `get`, `create`, `updateEstado`

### `pedidosStore.js`

- Estado listado (page, total, loading, error)
- Acciones cargar / crear

### Vistas

1. **PedidosListView**
   - Tabla + paginación
   - Botón Agregar pedido
   - Click fila → detalle

2. **PedidoNuevoView**
   - Campo Dirigido a
   - Form sección ítem + botones Agregar / Actualizar ítem
   - Tabla CRUD local (array en `ref`)
   - Generar pedido → POST → si OK, UI éxito + **Descargar PDF**
   - Link volver al listado

3. **PedidoDetalleView**
   - Datos + ítems
   - Select cambiar estado → PATCH
   - Descargar PDF de nuevo

---

## 4. PDF

**Opción preferida (alineada a factura / print del POS):**

- Util `frontend/src/utils/pedidoPdf.js`:
  - Abre ventana / genera HTML del pedido
  - Dispara impresión / “Guardar como PDF” del navegador
  - O usa librería mínima si el equipo prefiere archivo `.pdf` directo (evaluar `jspdf` solo si print HTML no basta)

**Decisión en implementación:** empezar con HTML + `window.print` (cero deps); si el usuario exige archivo PDF binario, añadir `jspdf` en follow-up.

---

## 5. Orden de ejecución

1. Schema MySQL + `pedidosStorage`
2. Rutas API + validación
3. Service + store frontend
4. ListView + link menú
5. NuevoView (CRUD ítems + generar)
6. DetalleView (estado + PDF)
7. Util PDF
8. QA manual
9. Deploy: `npm run build` + commit `dist` **solo si el usuario lo pide**

---

## 6. QA manual

1. Menú POS → Pedidos.
2. Listado vacío → mensaje + Agregar.
3. Crear pedido con 2–3 ítems → aparece en listado primero.
4. Paginación con >20 pedidos (o bajar limit en test).
5. Validación: sin ítems / sin dirigido a.
6. Editar/eliminar ítem en formulario antes de generar.
7. PDF descarga/impresión legible.
8. Cambiar estado en detalle; se refleja en listado.
9. Mobile ~390px.

---

## Impacto

- Backend: schema + storage + rutas.
- Frontend: módulo nuevo + 1 link menú.
- **Sin WordPress / WooCommerce:** no usar `wooClient` ni endpoints WC; solo MySQL (`pedidosStorage`).
- Dependencia PDF: ninguna si se usa print HTML.
