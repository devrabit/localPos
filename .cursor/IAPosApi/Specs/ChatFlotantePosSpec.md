# SPEC: Chat flotante en el POS (solo UI)

## Objetivo

Agregar al POS un **botón flotante con icono de chat**. Al hacer click, se despliega un
**panel de chat sobre el costado derecho** de la pantalla, con controles de **cerrar** y **minimizar**.

Esta versión es **solo la capa visual**: no hay backend, no hay red, no hay persistencia de
conversación. Más adelante se conectará al **APIAIGateway**.

---

## Alcance

### Incluye

- Botón flotante (FAB) fijo en el POS con icono de chat.
- Panel lateral derecho que se abre/cierra.
- Estado **minimizado** (barra compacta) además de cerrado/abierto.
- Área de mensajes con burbujas de ejemplo (mock local, en memoria).
- Campo de texto + botón enviar, que solo agrega el mensaje del vendedor a la lista local.
- Contrato de componente pensado para que conectar el APIAIGateway después no requiera rediseño.

### No incluye (esta versión)

- Llamadas HTTP / WebSocket a APIAIGateway ni a ningún backend.
- Endpoint nuevo en el backend Node.
- Persistencia en MySQL, localStorage o Pinia store global.
- Streaming de respuestas, historial entre recargas, adjuntos, voz.
- Respuestas reales de IA: el panel no simula respuestas del asistente al enviar.
- Multi-conversación, búsqueda en el historial, markdown enriquecido.

---

## Restricción crítica: convivencia con el lector de código de barras

El POS captura **todas** las teclas a nivel `window` para el lector USB
(`useBarcodeScanner.js`). El listener ignora el target cuando:

- es `INPUT`, `TEXTAREA` o `SELECT`,
- es `contentEditable`,
- **o está dentro de un elemento con `[data-no-barcode-scan]`**.

Por lo tanto:

- El **contenedor raíz del panel de chat** y el **FAB** deben llevar `data-no-barcode-scan`
  (mismo patrón que `CustomerPanel.vue` y `AsignarSkuModal.vue`).
- Sin eso, escribir en el chat alimentaría el buffer del lector y al pulsar Enter
  se dispararía una búsqueda de producto. Es un requisito funcional, no un detalle de estilo.

---

## Estados del panel

| Estado | Descripción | Qué se ve |
|---|---|---|
| `cerrado` | Estado inicial | Solo el FAB |
| `abierto` | Panel completo | Panel derecho + cabecera + mensajes + input. FAB oculto |
| `minimizado` | Barra compacta | Barra angosta abajo a la derecha con título e icono. FAB oculto |

Transiciones:

- `cerrado` → `abierto`: click en el FAB.
- `abierto` → `minimizado`: click en **minimizar**.
- `abierto` → `cerrado`: click en **cerrar**, o tecla `Escape` con el foco dentro del panel.
- `minimizado` → `abierto`: click en la barra minimizada.
- `minimizado` → `cerrado`: click en **cerrar** de la barra minimizada.

Al cerrar se **descartan** los mensajes locales (no hay persistencia en esta versión).
Al minimizar se **conservan** los mensajes mientras la vista siga montada.

---

## Layout y comportamiento visual

### Botón flotante (FAB)

- Posición: `fixed`, esquina **inferior derecha**.
- Tamaño mínimo táctil: 56×56 px (POS se usa en móvil).
- Icono de chat: SVG inline (burbuja de conversación), sin dependencias nuevas.
- Color: `bg-indigo-600` con texto blanco, coherente con los CTA existentes del POS.
- `aria-label="Abrir chat"`.
- Se oculta cuando el panel está `abierto` o `minimizado`.

### Panel abierto

- Desktop (≥ `sm`): panel anclado a la **derecha**, ancho fijo (~`w-96`), alto casi completo,
  separado de los bordes, con `rounded-xl` y `shadow-lg`.
- Móvil (< `sm`): ocupa el ancho disponible con márgenes, alto ~`80vh`, para que el teclado
  virtual no tape el input.
- **Sin overlay oscuro de fondo:** el vendedor debe poder seguir viendo y usando el POS.
- `z-index` por debajo de los modales existentes (que usan `z-50`) para no competir con
  `VariationPickerModal` / `AsignarSkuModal`: el chat usa `z-40`.

Estructura interna:

1. **Cabecera**: título (p. ej. “Asistente POS”), botón **minimizar** y botón **cerrar**.
2. **Cuerpo**: lista de mensajes con scroll propio (`overflow-y-auto`), autoscroll al último.
3. **Pie**: `textarea`/`input` + botón **Enviar**.

### Barra minimizada

- `fixed` abajo a la derecha, alto reducido.
- Muestra icono de chat + título; click en el cuerpo restaura; botón **cerrar** aparte.

---

## Mensajes (mock local)

Modelo por mensaje:

```js
{ id: string, autor: 'vendedor' | 'asistente', texto: string, hora: string }
```

- Estado local en el componente (`ref([])`), **no** un store Pinia.
- Se precarga **un** mensaje de bienvenida del `asistente` (texto fijo), para que el panel
  no se vea vacío y se aprecie el estilo de ambas burbujas.
- Enviar agrega un mensaje `autor: 'vendedor'`. **No** se genera respuesta automática.
- Estilos: burbujas del vendedor alineadas a la derecha (fondo indigo, texto blanco);
  las del asistente a la izquierda (fondo slate claro).
- Validación: no se envía texto vacío o solo espacios. Límite 1000 caracteres.
- `Enter` envía; `Shift+Enter` inserta salto de línea.

---

## Contrato del componente (preparado para APIAIGateway)

Componente: `frontend/src/components/ChatAsistentePanel.vue`

Props:

| Prop | Tipo | Default | Uso |
|---|---|---|---|
| `titulo` | String | `'Asistente POS'` | Título de la cabecera |
| `mensajeBienvenida` | String | texto fijo | Primer mensaje del asistente |
| `enviando` | Boolean | `false` | Reservado: mostrará “escribiendo…” cuando exista el gateway |

Eventos:

| Evento | Payload | Uso |
|---|---|---|
| `enviar` | `{ texto }` | Lo emitirá el panel al enviar. En esta versión el POS **no** hace nada con él |
| `cerrar` | — | El POS pasa el estado a `cerrado` |

La integración futura con APIAIGateway consistirá en escuchar `enviar`, llamar al gateway y
empujar la respuesta como mensaje `asistente`, sin tocar el layout.

---

## Accesibilidad

- Panel con `role="dialog"` y `aria-label` del título.
- Botones con `aria-label`: “Minimizar chat”, “Cerrar chat”, “Enviar mensaje”.
- Foco al `input` al abrir el panel.
- `Escape` cierra (sin interferir con `Escape` del lector, porque el foco está dentro
  del área marcada con `data-no-barcode-scan`).
- Contraste suficiente en ambas burbujas.

---

## Fuera de alcance explícito

- Cualquier `api.get` / `api.post` desde el chat.
- Cambios en `backend/`.
- Cambios en el router (el chat vive dentro de `PosView`, no es una ruta).
- Cambios en las stores existentes.
- Reordenamiento del dashboard (`moduleOrder`): el chat es independiente y no participa.

---

## Criterios de aceptación

1. En `/` (POS) se ve un **botón flotante** con icono de chat, abajo a la derecha.
2. Click en el FAB **despliega un panel a la derecha**; el FAB desaparece.
3. El panel tiene botón **minimizar** y botón **cerrar**, ambos visibles en la cabecera.
4. **Minimizar** deja una barra compacta; volver a hacer click restaura el panel con los
   mensajes intactos.
5. **Cerrar** oculta el panel y vuelve a mostrar el FAB.
6. Escribir en el chat y pulsar `Enter` **no** dispara la búsqueda de producto ni el beep del
   lector de código de barras.
7. El mensaje escrito aparece como burbuja del vendedor; no aparece respuesta automática.
8. El panel **no** bloquea el resto del POS (sin overlay); el carrito y el listado siguen usables.
9. Con un modal abierto (variaciones / asignar SKU), el modal queda **por encima** del chat.
10. En ~390 px de ancho el panel es usable y el input queda accesible.
11. `npm run build` del frontend compila sin errores nuevos.
12. No se agregó ninguna dependencia npm ni ningún endpoint de backend.
