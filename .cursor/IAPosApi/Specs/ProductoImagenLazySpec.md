# SPEC: Imagen en card de producto con lazy loading (POS)

## Objetivo

Mostrar la imagen del producto **directamente en la card** del catálogo, cargándola con **lazy loading** para no degradar el rendimiento del POS (catálogo grande ~800+ ítems, uso mobile).

## Contexto actual

- Card: `frontend/src/components/ProductList.vue`
- Ya existe campo `imagen` en el DTO (`GET /api/productos` → `images[0].src` de Woo o `null`).
- Ya existe botón **"Ver imagen"** + modal a demanda.
- El listado renderiza todos los productos filtrados (sin virtualización).
- Con buscador vacío se muestran cientos de cards a la vez.

## Alcance

### Backend

- **Sin cambios** si `imagen` ya está en el DTO.
- Confirmar que la URL sigue siendo la de WooCommerce (no se proxya ni se embebe en base64).

### Frontend — imagen en card

- Cada card muestra un **thumbnail** de la imagen del producto.
- Atributo nativo obligatorio: `loading="lazy"` en el `<img>`.
- Atributo recomendado: `decoding="async"`.
- Tamaño fijo en UI (evitar layout shift):
  - Contenedor con alto/ancho definidos (p. ej. ~72–96px de alto, `object-cover` o `object-contain` dentro del box).
- Si `imagen` es `null` o falla la carga: placeholder visual (“Sin imagen” o bloque neutro), sin romper la card.
- Click en la zona de agregar / variaciones: **sin cambio** (add / pick-variable).
- Click en el thumbnail: **opcional** abrir el modal existente a tamaño grande (reutilizar overlay actual). No debe disparar add/pick (`stopPropagation`).

### Frontend — botón "Ver imagen"

- **Opción A (preferida):** quitar el botón "Ver imagen" y dejar thumbnail + click en imagen para ampliar.
- **Opción B:** mantener el botón además del thumbnail (más clutter; solo si se pide explícitamente).

Default del SPEC: **Opción A**.

## Lazy loading (requisitos)

1. No precargar todas las imágenes del catálogo al montar el listado.
2. El navegador solo descarga imágenes **cerca del viewport** (`loading="lazy"`).
3. No usar base64 ni descarga masiva vía API.
4. No bloquear la interacción de venta mientras cargan thumbs.

## UI / UX

- Thumbnail arriba o a la izquierda del texto (mobile-friendly).
- Card sigue siendo rápida de tocar para vender.
- Modal de ampliación (si se usa): igual que hoy (cerrar, backdrop, Escape).
- Placeholder consistente cuando no hay URL.

## Rendimiento (criterios)

- Con listado completo visible al scrollear: solo se solicitan imágenes de cards entrando al viewport (comportamiento nativo lazy).
- No aumentar el payload JSON más allá del campo `imagen` ya existente.
- Evitar imágenes a tamaño full ocupando toda la card; solo thumbnail acotado.

## Fuera de alcance

- Virtualización del listado (`vue-virtual-scroller`, etc.).
- Generación de thumbnails en el backend / CDN resize.
- Galería multi-imagen.
- Imágenes por variación.
- Service Worker / cache offline de imágenes.
- Prefetch agresivo de todas las URLs.

## Criterios de aceptación

1. Cada card con `imagen` muestra un thumbnail con `loading="lazy"`.
2. Productos sin imagen muestran placeholder, sin error de UI.
3. Al abrir el POS / listado completo, **no** se disparan cientos de requests de imagen de golpe (solo las del viewport + margen lazy del browser).
4. Click en el cuerpo de la card sigue agregando / abriendo variaciones.
5. Click en thumbnail (si aplica) abre modal grande **sin** agregar al carrito.
6. El botón "Ver imagen" se elimina (Opción A) o se justifica si se mantiene (Opción B).
7. No hay cambios de schema DB ni rutas API nuevas.
