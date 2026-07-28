# SPEC: Botón zoom superpuesto en imagen de producto (POS)

## Objetivo

Sobre la imagen del producto en la card, mostrar un **botón superpuesto con icono de zoom**. Al hacer click, abrir un **popup/modal** con la imagen ampliada.

## Contexto actual

- Card: `frontend/src/components/ProductList.vue`
- Thumbnail con `loading="lazy"` ya visible en la card.
- Ya existe modal/popup de ampliación (click en toda la imagen).
- Campo `imagen` disponible en el DTO.

## Alcance

### Frontend

- Contenedor del thumbnail en `position: relative`.
- Botón de zoom **superpuesto** (esquina, p. ej. inferior-derecha o superior-derecha):
  - Icono de lupa / zoom (SVG inline, sin librería nueva).
  - Touch-friendly (mín. ~36–44px de área táctil).
  - Visible cuando hay imagen válida (`mostrarThumb`).
  - **No** mostrar el botón si no hay imagen / placeholder.
- Click en el botón zoom:
  - Abre el popup existente con la imagen ampliada.
  - `stopPropagation` → no agrega al carrito ni abre variaciones.
- Click en el resto del thumbnail (imagen):
  - **Opción preferida:** no abre el modal (solo el botón zoom lo abre), para evitar toques accidentales.
  - Alternativa aceptable: imagen y botón abren el mismo popup.
- Click en zona de texto/precio: sin cambio (add / pick-variable).
- Popup (reutilizar el actual):
  - Imagen grande `object-contain`.
  - Cierre: botón Cerrar, click en backdrop, Escape.
  - Si no hay URL: mensaje “Sin imagen”.

### Backend

- Sin cambios.

## UI / UX

- Botón circular o cuadrado redondeado, contraste legible sobre la foto (fondo semitransparente oscuro o blanco + sombra).
- Icono claro de zoom/lupa.
- No tapar toda la imagen; solo una esquina.
- Mobile POS: fácil de pulsar sin activar la venta.

## Fuera de alcance

- Zoom pinch / pan dentro del modal.
- Galería multi-imagen.
- Librería de iconos nueva (Heroicons CDN, etc.).
- Cambios de API.

## Criterios de aceptación

1. Con imagen válida, se ve el botón zoom superpuesto en el thumbnail.
2. Click en zoom abre popup con la imagen ampliada.
3. Click en zoom no agrega al carrito ni abre variaciones.
4. Sin imagen: no hay botón zoom; se mantiene placeholder.
5. Popup se cierra con Cerrar / backdrop / Escape.
6. No se agrega dependencia de iconos externa.
