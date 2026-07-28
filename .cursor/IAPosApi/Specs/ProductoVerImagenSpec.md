# SPEC: Ver imagen en card de producto (POS)

## Objetivo

En la card de producto del catálogo POS, agregar un botón **"Ver imagen"** que, al hacer click, muestre la imagen del producto.

## Contexto actual

- Card: `frontend/src/components/ProductList.vue`
- Toda la card es un `<button>` que agrega al carrito (o abre variaciones).
- El DTO de productos (`mapProductDto` en backend) **no** incluye URL de imagen.
- WooCommerce sí provee `images[]` en el producto REST.

## Alcance

### Backend

- Incluir en el DTO de producto un campo `imagen` (URL string o `null`).
- Origen: primera imagen de WooCommerce (`images[0].src`).
- Si no hay imagen: `imagen: null`.
- Aplica a `GET /api/productos` (y al mismo mapeo si se reutiliza en escaneo/variaciones padre).

### Frontend

- En cada card de producto, botón visible **"Ver imagen"**.
- Al click:
  - Si hay `imagen`: mostrar la imagen en un overlay/modal a pantalla usable en mobile.
  - Si no hay `imagen`: feedback claro (toast/mensaje breve o estado vacío en el modal: “Sin imagen”).
- El click en **"Ver imagen"** **no** debe agregar al carrito ni abrir el selector de variaciones.
- El click en el resto de la card mantiene el comportamiento actual (add / pick-variable).

## UI / UX

- Botón secundario, claro, touch-friendly (POS mobile).
- Overlay/modal:
  - Imagen centrada, `object-contain`, fondo oscuro o semitransparente.
  - Cierre: botón cerrar, click fuera, y tecla Escape (si aplica en desktop).
- No mostrar la imagen siempre en la card (solo bajo demanda).

## Reglas técnicas

- Evitar botones anidados: la card no puede seguir siendo un único `<button>` con otro botón dentro.
- Estructura sugerida: contenedor de card + zona principal clickeable + botón "Ver imagen" independiente.
- `stopPropagation` en el botón de imagen para no disparar add/pick.

## Fuera de alcance

- Galería de varias imágenes / zoom avanzado.
- Edición o subida de imágenes.
- Imágenes por variación (solo imagen del producto padre / simple).
- Cache offline de imágenes.

## Criterios de aceptación

1. Cada card muestra el botón **"Ver imagen"**.
2. Click en el botón abre el visor con la imagen del producto cuando existe URL.
3. Click en el botón no agrega al carrito ni abre variaciones.
4. Click en el resto de la card sigue agregando / abriendo variaciones.
5. Producto sin imagen: se informa “Sin imagen” (o equivalente) sin romper la UI.
6. El API de productos incluye `imagen` en la respuesta.
