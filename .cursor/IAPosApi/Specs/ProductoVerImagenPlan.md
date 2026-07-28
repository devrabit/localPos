# PLAN: Ver imagen en card de producto (POS)

## Skills

- `Skills/BackendNode.md`
- `Skills/FrontentVue.md`
- `Skills/WooCommerce.md` (solo mapeo de `images`)

## Pasos de implementación

### 1. Backend — exponer imagen en DTO

**Archivo:** `backend/src/routes/api.js`

- En `mapProductDto`:
  - Extraer `imagen` desde `p.images?.[0]?.src` (string).
  - Si no existe o está vacío → `imagen: null`.
  - Agregar `imagen` al objeto DTO retornado.
- Verificar que `GET /api/productos` ya usa `mapProductDto` (no hace falta ruta nueva).
- Si el mismo mapper se usa en escaneo, la imagen queda disponible sin trabajo extra.

### 2. Frontend — reestructurar card

**Archivo:** `frontend/src/components/ProductList.vue`

- Cambiar la card de `<button>` único a un contenedor (`div`/`article`) con:
  - **Zona principal** (click): add / pick-variable (mismo comportamiento actual).
  - **Botón** “Ver imagen” separado, con `@click.stop`.
- Mantener estilos Tailwind actuales (bordes, tipografía, badge de variaciones).

### 3. Frontend — visor de imagen

**Opción A (preferida, mínimo archivos):** estado local en `ProductList.vue`

- `imagenActiva` (`url` + `nombre`) o `null`.
- Botón “Ver imagen” → setea `imagenActiva`.
- Modal/overlay:
  - Si hay URL → `<img :src="..." :alt="nombre">`.
  - Si no → texto “Sin imagen”.
  - Cerrar: botón X / click backdrop / Escape.

**Opción B (si crece):** componente `ProductImageModal.vue` — solo si el modal ensucia demasiado el listado.

### 4. Pruebas manuales

1. Producto con imagen Woo → “Ver imagen” muestra la foto.
2. Producto sin imagen → mensaje “Sin imagen”.
3. Click en “Ver imagen” no suma al carrito.
4. Click en el cuerpo de la card sí suma / abre variaciones.
5. Cerrar modal y seguir vendiendo normal.
6. Probar en viewport mobile (~390px).

### 5. Entrega local

- Tras aprobación e implementación: reiniciar backend/frontend si el usuario lo pide o forma parte de la entrega acordada.

## Orden de ejecución

1. Backend `imagen` en DTO  
2. Reestructurar card + botón  
3. Modal visor  
4. QA manual  

## Estimación de impacto

- Bajo: 1 archivo backend + 1 (o 2) frontend.
- Sin cambios de schema MySQL.
- Sin rutas API nuevas.
