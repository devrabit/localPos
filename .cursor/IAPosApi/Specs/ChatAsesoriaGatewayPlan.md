# PLAN: Conectar el chat de asesoría del vendedor con Nari AI Gateway

## Skills

- `.cursor/IAPosApi/Skills/BackendNode.md`
- `.cursor/IAPosApi/Skills/FrontentVue.md`

## Base

- SPEC: `.cursor/IAPosApi/Specs/ChatAsesoriaGatewaySpec.md`
- UI previa: `ChatFlotantePosSpec.md` y el commit `a1e2db3` (`ChatAsistentePanel.vue` + cableado en `PosView.vue`). Ese commit **no** está en `main`.
- Patrones de test: `backend/tests/api.test.js` (`node:test` + `supertest` + `createApiRouter`).
- Cliente HTTP del POS: `frontend/src/services/api.js` (axios, `baseURL` `/api`, timeout 120 s). No cambiar ese timeout.

**No** se mergea la rama entera del chat: arrastra pedidos, sin-SKU y deploy. Solo entra el panel y su cableado.

---

## 0. Traer el chat de solo UI

1. Copiar `frontend/src/components/ChatAsistentePanel.vue` desde `a1e2db3` (archivo nuevo, sin conflicto).
2. Incorporar en el `PosView.vue` de esta rama el FAB, `chatEstado`, la barra minimizada y el montaje del panel, a mano, según `ChatFlotantePosSpec.md`.
   - Un cherry-pick de `a1e2db3` sobre `PosView.vue` choca: esa vista ya divergió.
   - Conservar `v-if="chatEstado !== 'cerrado'"` + `v-show="chatEstado === 'abierto'"` para que minimizar no desmonte el panel.
3. Dejar `onChatEnviar` vacío en este paso. El paso 4 lo conecta.
4. No traer stores, router ni backend de esa rama.

---

## 1. Configuración del gateway

**Archivo:** `backend/src/config/env.js`

- Agregar `readGatewayEnv()` que lee **en cada llamada**:
  - `GATEWAY_URL`: `process.env.GATEWAY_URL` sin barra final, o `https://nariaigateway.nariuniverse.com`.
  - `GATEWAY_API_KEY`: `process.env.GATEWAY_API_KEY` en trim, o `''`.
- No leerlos en el objeto `env` congelado al hacer `require`: los tests cambian `process.env` después de importar.
- `assertEnv()` no exige estas variables.

**Archivo:** `backend/.env.example`

```
# Asesor del vendedor (Nari AI Gateway). Si GATEWAY_API_KEY falta, el POS arranca y POST /api/asesoria responde 503.
# GATEWAY_URL=https://nariaigateway.nariuniverse.com
# GATEWAY_API_KEY=
```

No hay variable `VITE_GATEWAY_*`.

---

## 2. Cliente del gateway

**Archivo nuevo:** `backend/src/services/asesoriaGateway.js`

Exportar `askVendedor(question, sessionId, deps)`.

`deps` (todos opcionales, para tests):

| Dep | Default |
|---|---|
| `fetchImpl` | `globalThis.fetch` |
| `sleep` | `setTimeout` envuelto en promesa |
| `readEnv` | `readGatewayEnv` |
| `log` | `console.error` |

Comportamiento:

1. Si `readEnv().apiKey` está vacío → `{ ok: false, status: 503, code: 'ASESORIA_NO_CONFIGURADA', error: 'El asesor no está configurado en el servidor.', requestId: null }`. Cero `fetch`.
2. `POST ${url}/v1/ask` con headers `content-type: application/json` y `x-api-key`, body solo `{ question, profile: 'vendedor', sessionId }`. Ignorar cualquier perfil o `modelOverride` que hubiera llegado de más arriba: esta función no los recibe.
3. `signal: AbortSignal.timeout(60_000)`.
4. Parsear JSON. Si el body no es JSON, tratarlo como fallo.
5. HTTP 200:
   - Sin `answer` string → `{ ok: false, status: 502, code: 'LLM_ERROR', ... }` **sin segundo intento** (el gateway ya respondió; no se duplica la llamada).
   - Si hay `answer`: devolver `{ ok: true, answer, clientMessage: string|null, sources: array, needsClarification: boolean, requestId }`. `sources` ausente → `[]`. `clientMessage` ausente → `null`. No copiar `route`, `usage` ni `toolCalls`.
6. Mapear errores como en el SPEC (texto de cajero incluido):

| Status gateway | `code` | status POS | Reintenta |
|---|---|---|---|
| 400 | `BAD_REQUEST` | 400 | no |
| 401 | `UNAUTHORIZED` | 502 | no |
| 422 | `NO_GROUNDING` | 502 | 1, ya |
| 429 | `RATE_LIMITED` | 429 | 1, tras `sleep(1500)` |
| 502 | `LLM_ERROR` | 502 | 1, ya |
| 503 | `PROVIDER_UNAVAILABLE` | 503 | no |
| timeout / red | `ASESOR_TIMEOUT` | 504 | no |
| otro | `ASESOR_ERROR` | 502 | no |

7. Un solo reintento. El segundo fallo se devuelve tal cual. `requestId` sale de `error.requestId` del gateway cuando exista.
8. En cada fallo: `log('[asesoria] code=%s http=%s requestId=%s', code, status, requestId)`. El string no incluye pregunta, respuesta ni la API key.

Textos de cajero: los de la tabla del SPEC, sección 5.

---

## 3. Ruta `POST /api/asesoria`

**Archivo:** `backend/src/routes/api.js`

- Segundo argumento opcional de `createApiRouter(woo, deps)`: `deps.askVendedor` (default: el `askVendedor` real). Los tests actuales no pasan `deps` y no se rompen.
- Schema zod en la ruta (no dejar que el handler global traduzca a `"Invalid request payload"`):

```js
question: z.string().trim().min(3).max(600)
sessionId: z.string().trim().regex(/^pos:web:[A-Za-z0-9-]+$/).max(128)
```

- Zod de `question` → `400` `{ error: 'La pregunta debe tener entre 3 y 600 caracteres.', code: 'BAD_REQUEST' }`.
- Zod de `sessionId` → `400` `{ error: 'La sesión de consulta no es válida.', code: 'BAD_REQUEST' }`.
- Éxito → `200` con `{ answer, clientMessage, sources, needsClarification, requestId }`.
- Fallo de `askVendedor` → `res.status(result.status).json({ error, code, requestId })`.

La ruta no llama a WooCommerce.

---

## 4. Panel: respuesta, copiar y nueva consulta

**Archivo:** `frontend/src/components/ChatAsistentePanel.vue`

Partir del componente del paso 0.

- `MAX_CARACTERES = 600` y `:maxlength="600"`.
- Mensaje:

```js
{ id, autor, texto, hora, clientMessage: null, sources: [], esError: false }
```

- `defineExpose({ focus, agregarAsistente, reiniciar })`.
  - `agregarAsistente({ texto, clientMessage, sources, esError })` hace push, autoscroll.
  - `reiniciar()` deja solo el mensaje de bienvenida y limpia el borrador.
- Emitir `nueva-consulta` desde un botón de cabecera (`aria-label="Nueva consulta"`), junto a minimizar y cerrar. El panel no genera el `sessionId`.
- `enviar()`:
  - Vacío: no hace nada.
  - Trim de 1 o 2 caracteres: no emite `enviar`; muestra bajo el textarea “Escribe al menos 3 caracteres.”
  - 3–600: push de burbuja `vendedor`, emite `enviar` con `{ texto }`, limpia el borrador y el aviso.
- Con `enviando === true`: deshabilitar Enviar y el textarea; se mantiene el “Escribiendo...” que ya existe.
- Burbuja `asistente` con `esError === false`:
  1. Etiqueta **Interno** + `texto` (`whitespace-pre-wrap`).
  2. **Para el cliente** + `clientMessage` + **Copiar**, o el texto “Sin mensaje listo para el cliente” si `clientMessage` es `null` o `''` (sin botón).
  3. Fuentes: `name`, `price`, stock, `sku` solo si viene, enlace `target="_blank"` `rel="noopener noreferrer"`. Stock: número → “{n} disp.”; `stock == null` e `inStock === true` → “Disponible”; `inStock === false` → “Sin stock”; si no hay dato, omitir stock.
- Burbuja `esError === true`: solo el texto, fondo ámbar, sin bloque de cliente ni fuentes.
- `copiar(texto)`: `navigator.clipboard.writeText`. Éxito → el botón dice “Copiado” ~1,5 s. Fallo → “No se pudo copiar”. Copiar solo `clientMessage`.
- Seguir con `data-no-barcode-scan` en la raíz.

---

## 5. Orquestación en el POS

**Archivo:** `frontend/src/views/PosView.vue`

- `sessionId = ref('')`, `chatEnviando = ref(false)`.
- `nuevoSessionId()`: `` `pos:web:${crypto.randomUUID()}` ``.
- `abrirChat()`: si el estado era `cerrado`, asigna un `sessionId` nuevo. Si venía de `minimizado`, no lo cambia. Luego `chatEstado = 'abierto'` y foco.
- `cerrarChat()`: `chatEstado = 'cerrado'`. No hace falta borrar el id; la próxima apertura lo reemplaza. El `v-if` desmonta el panel y pierde los mensajes.
- `onNuevaConsulta()`: nuevo `sessionId` y `chatPanelRef.reiniciar()`. No llama al gateway.
- `onChatEnviar({ texto })`:
  1. Si `chatEnviando` es true, return.
  2. `chatEnviando = true`.
  3. `api.post('/asesoria', { question: texto, sessionId: sessionId.value })`.
  4. 200 → `agregarAsistente` con `answer`, `clientMessage ?? null`, `sources ?? []`, `esError: false`.
  5. Error → `agregarAsistente` con `texto = response.data.error` o “El asesor no responde. Intenta de nuevo.”, `esError: true`, sin fuentes.
  6. `finally`: `chatEnviando = false`.
- Pasar `:enviando="chatEnviando"` al panel.
- No escribir la respuesta en el carrito ni en Pinia.

---

## 6. Pruebas del proxy

**Archivo nuevo:** `backend/tests/asesoria.test.js`

Montar Express con `createApiRouter(mockWoo, { askVendedor })` cuando el caso solo prueba validación. Para el cliente, llamar `askVendedor` directo con `fetchImpl`, `sleep` y `log` falsos (el sleep falso no espera 1,5 s).

Casos del SPEC, sección 8:

1. 200 del gateway: el `fetch` recibió `profile: 'vendedor'`, la pregunta, el `sessionId` y `x-api-key`. La respuesta no tiene `route`, `usage` ni `toolCalls`.
2. Pregunta de 2 caracteres y de 601 → 400, `fetch` no se llama.
3. `sessionId` fuera de `pos:web:…` → 400.
4. Sin `GATEWAY_API_KEY` → 503 `ASESORIA_NO_CONFIGURADA`.
5. Gateway 401 con `requestId` → status 502, `code: UNAUTHORIZED`, y el log contiene el `requestId` y no la pregunta.
6. Primera llamada 422, segunda 200 → un reintento y resultado ok.
7. 429 y luego 429 → `sleep` llamado una vez; status 429.
8. 503 → un solo `fetch`, `PROVIDER_UNAVAILABLE`.
9. `fetch` que rechaza por timeout → `ASESOR_TIMEOUT`, status 504.
10. `clientMessage: null` se conserva.

`cd backend && npm test` queda verde, incluida la suite que ya existe.

---

## 7. Verificación

1. `cd backend && npm test`
2. `cd frontend && npm run build`
3. `cd frontend && npm test` (la suite actual no cubre el chat; no debe romperse).
4. Backend en `http://localhost:3001` y Vite en `http://localhost:5173`.
5. QA manual en `/`:
   - Abrir el chat, escribir y pulsar Enter: el lector no pita.
   - Pregunta de 1–2 caracteres: aviso local, sin request.
   - Con `GATEWAY_API_KEY` vacía: “El asesor no está configurado en el servidor.”
   - Con clave real (solo en `backend/.env`, no en el repo): la burbuja muestra Interno, Para el cliente y fuentes; Copiar pega el `clientMessage`.
   - Si `clientMessage` es null: “Sin mensaje listo para el cliente”.
   - Nueva consulta borra el hilo y la siguiente pregunta usa otro `sessionId` (ver en la pestaña Red).
   - Minimizar y restaurar conserva el hilo.
   - Cerrar y abrir empieza de cero.
   - Modal de variaciones por encima del chat (`z-50` sobre `z-40`).
   - Ancho ~390 px: input y Copiar usables.

No llamar al gateway desde el navegador (en Red solo aparece `/api/asesoria`).

---

## 8. Orden de ejecución

1. Paso 0: panel y FAB sobre el `PosView` actual.
2. `readGatewayEnv` + `.env.example`.
3. `asesoriaGateway.js`.
4. `POST /api/asesoria`.
5. Tests del proxy y `npm test`.
6. Panel (600, burbuja, copiar, nueva consulta) y `PosView`.
7. Build del frontend y QA manual.
8. Reiniciar backend (`npm start` en `backend/`) y Vite si no está en marcha.

Deploy y `dist/` solo si se piden después. La clave en Hostinger se carga en hPanel, no en este cambio.

---

## Impacto

- Backend: un servicio, una ruta, dos variables opcionales, un archivo de tests.
- Frontend: el panel que ya existe en el otro commit, más el handler en `PosView.vue`.
- Dependencias: ninguna.
- WooCommerce: sin cambios.
- Riesgo principal: la API key en el cliente. Se mitiga porque solo el proceso Node la lee y los tests afirman que el JSON al navegador no la incluye.
