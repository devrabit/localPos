# PLAN: Botón zoom superpuesto en imagen (POS)

## Skills

- `Skills/FrontentVue.md`

## Base

- SPEC: `ProductoZoomImagenSpec.md`
- Archivo único: `frontend/src/components/ProductList.vue`
- Modal `imagenActiva` / `abrirImagen` / `cerrarImagen` ya existen.

## Pasos

### 1. Contenedor relativo del thumbnail

- En el `div` del thumb (`h-20`):
  - Añadir `relative`.
  - Imagen como `<img>` (no botón full-bleed).
  - Quitar que toda la imagen sea el trigger del modal (preferido por SPEC).

### 2. Botón zoom superpuesto

- Solo si `mostrarThumb(producto)`:
  ```html
  <button
    type="button"
    class="absolute bottom-1.5 right-1.5 ... rounded-full bg-slate-900/70 text-white"
    aria-label="Ampliar imagen"
    @click.stop="abrirImagen(producto)"
  >
    <!-- SVG lupa -->
  </button>
  ```
- SVG inline simple (círculo + manija), `aria-hidden="true"` en el icono.
- Tamaño táctil adecuado (`p-2` / `size-9`).

### 3. Popup

- Reutilizar Teleport/modal actual sin cambios de lógica.
- Confirmar que sigue cerrando con Escape / backdrop / Cerrar.

### 4. QA

1. Producto con imagen → botón zoom visible encima.
2. Click zoom → popup ampliado.
3. Click zoom no suma al carrito.
4. Click texto card → add / variaciones OK.
5. Sin imagen → sin botón zoom.
6. Mobile ~390px.

### 5. Deploy

- Solo si el usuario lo pide: build `dist` + commit + push.

## Orden

1. relative + img sin trigger full  
2. botón zoom + SVG  
3. QA  

## Impacto

- Solo UI en `ProductList.vue`.
- Sin API / sin deps nuevas.
