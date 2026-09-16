# PLAN: Chat flotante en el POS (solo UI)

## Skills

- `Skills/FrontentVue.md`

## Base

- SPEC: `ChatFlotantePosSpec.md`
- Patrones existentes: `CustomerPanel.vue` (`data-no-barcode-scan`),
  `AsignarSkuModal.vue` / `VariationPickerModal.vue` (paneles `fixed`, `z-50`, cerrar con botón),
  `PosView.vue` (host del POS)

**Sin backend.** No se toca `backend/`, ni el router, ni las stores.

---

## 1. Componente del panel

**Archivo nuevo:** `frontend/src/components/ChatAsistentePanel.vue`

- `defineProps`: `titulo`, `mensajeBienvenida`, `enviando` (según SPEC).
- `defineEmits`: `['enviar', 'cerrar', 'minimizar']`.
- Estado local:
  - `mensajes = ref([...])` inicializado con el mensaje de bienvenida del asistente.
  - `borrador = ref('')`, `inputRef = ref(null)`, `listaRef = ref(null)`.
- Funciones:
  - `enviar()`: valida no vacío y ≤ 1000 chars, hace `push` de `{ autor: 'vendedor' }`,
    limpia el borrador, emite `enviar`, y llama a `scrollAlFinal()`.
  - `scrollAlFinal()`: `nextTick` + `listaRef.scrollTop = scrollHeight`.
  - `onKeydown`: `Enter` sin `Shift` → `enviar()` y `preventDefault`.
- Template:
  - Raíz `<section>` con **`data-no-barcode-scan`** y clases `fixed ... z-40`.
  - Responsive: `inset-x-4 bottom-4 h-[80vh]` en móvil; `sm:inset-auto sm:right-4 sm:top-4
    sm:bottom-4 sm:w-96 sm:h-auto` en desktop (ajustar al render real).
  - Cabecera con título + 2 botones (`aria-label` “Minimizar chat” / “Cerrar chat”).
  - Cuerpo `overflow-y-auto` con `v-for` de burbujas; clase condicional por `autor`.
  - Pie con `textarea` + botón **Enviar** (`:disabled` si borrador vacío).
  - `role="dialog"`, `:aria-label="titulo"`, `@keydown.esc="$emit('cerrar')"`.
- `onMounted`: foco al input.

Icono de chat: SVG inline (burbuja) dentro del componente y del FAB. **Sin nuevas dependencias.**

---

## 2. FAB + orquestación de estado en el POS

**Archivo:** `frontend/src/views/PosView.vue`

- Importar `ChatAsistentePanel`.
- Estado: `chatEstado = ref('cerrado')` con valores `'cerrado' | 'abierto' | 'minimizado'`.
- Handlers: `abrirChat()`, `minimizarChat()`, `cerrarChat()`, `restaurarChat()`.
- Template, al final del `<main>` (fuera de los módulos reordenables):
  1. **FAB** `v-if="chatEstado === 'cerrado'"`: `<button>` `fixed bottom-4 right-4 z-40`,
     56×56, `rounded-full bg-indigo-600`, `aria-label="Abrir chat"`,
     **con `data-no-barcode-scan`**.
  2. **Panel** `v-if="chatEstado === 'abierto'"`: `<ChatAsistentePanel @cerrar="cerrarChat"
     @minimizar="minimizarChat" />`.
  3. **Barra minimizada** `v-if="chatEstado === 'minimizado'"`: `fixed bottom-4 right-4 z-40`,
     `data-no-barcode-scan`, click restaura + botón cerrar propio.
- El evento `enviar` del panel **no** se conecta a nada todavía (queda el `@enviar` sin handler
  o con un handler vacío documentado como punto de integración del APIAIGateway).

**Nota de `z-index`:** el chat usa `z-40`; los modales existentes siguen en `z-50` y quedan encima.

---

## 3. Verificación

1. `cd frontend && npm run build` — compila.
2. `cd frontend && npm test` — la suite existente sigue verde.
3. Vite en `http://localhost:5173` y QA manual:
   - FAB visible en el POS.
   - Abrir → panel a la derecha, FAB oculto.
   - Minimizar → barra compacta; restaurar conserva mensajes.
   - Cerrar → vuelve el FAB.
   - **Escribir texto + Enter en el chat: no suena el beep ni se dispara búsqueda de producto**
     (verificación del riesgo principal).
   - Abrir el modal de variaciones con el chat abierto: el modal queda encima.
   - Ancho ~390 px: panel e input usables.

---

## 4. Orden de ejecución

1. `ChatAsistentePanel.vue`.
2. FAB + estado + barra minimizada en `PosView.vue`.
3. Build + tests.
4. QA manual con Vite.
5. Deploy (`npm run build` raíz + commit de `dist/`) **solo si el usuario lo pide**.

---

## Impacto

- Frontend: 1 componente nuevo + cambios acotados en `PosView.vue`.
- Backend: **ninguno**.
- Dependencias: **ninguna**.
- Riesgo principal: conflicto con el lector de código de barras — mitigado con
  `data-no-barcode-scan` en el FAB, el panel y la barra minimizada.
