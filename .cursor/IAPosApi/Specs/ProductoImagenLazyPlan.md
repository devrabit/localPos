# PLAN: Imagen en card con lazy loading (POS)

## Skills

- `Skills/FrontentVue.md`
- Backend: sin cambios esperados (campo `imagen` ya existe)

## Base

- SPEC: `ProductoImagenLazySpec.md`
- Código actual: `frontend/src/components/ProductList.vue` (botón + modal)

## Pasos

### 1. Thumbnail en la card

**Archivo:** `frontend/src/components/ProductList.vue`

- Insertar bloque de imagen en cada `article`:
  - Contenedor tamaño fijo (p. ej. `h-20 w-full` o `h-20 w-20`).
  - Si hay `producto.imagen`:
    ```html
    <img
      :src="producto.imagen"
      :alt="producto.nombre"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-contain"
      @click.stop="abrirImagen(producto)"
    />
    ```
  - Si no: placeholder “Sin imagen”.
- `@error` en img → mostrar placeholder (URL rota).

### 2. Quitar botón "Ver imagen" (Opción A)

- Eliminar el botón de texto.
- Mantener modal existente; abrir solo con click en thumbnail.

### 3. Layout card

- Ajustar grid interno: imagen + datos, sin romper touch target del add/pick.
- Zona de texto/click de venta separada del thumbnail.

### 4. QA manual

1. Abrir POS con catálogo completo → en Network, pocas imágenes al inicio (viewport).
2. Scroll → nuevas requests al entrar cards al viewport.
3. Click card → add / variaciones OK.
4. Click imagen → modal; no agrega al carrito.
5. Producto sin imagen / URL rota → placeholder.
6. Probar en viewport mobile (~390px).

### 5. Deploy (solo si se aprueba y se pide)

- `npm run build` → commit `dist` → push (petición explícita).

## Orden

1. Thumbnail + lazy  
2. Quitar botón  
3. Click imagen → modal  
4. QA  

## Impacto

- Solo frontend (`ProductList.vue`).
- Bajo riesgo; mejora UX sin API nueva.
