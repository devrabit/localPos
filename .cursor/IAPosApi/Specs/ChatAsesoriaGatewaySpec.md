# SPEC: Conectar el chat de asesoría del vendedor con Nari AI Gateway

Documento de referencia: `INTEGRACION-POS.md` (Integración POS ↔ Nari AI Gateway, v1.0, 2026-09-23).

Contrato previo de UI: `ChatFlotantePosSpec.md` (`ChatAsistentePanel.vue` en el POS). Esa pantalla es solo visual: el evento `enviar` no llama a ningún servicio. Este SPEC la conecta al asesor interno.

---

## 1. Objetivo

El vendedor sigue usando el **chat flotante** del POS. Cada pregunta sale del navegador hacia el **backend del POS**, y solo ese backend llama a `POST /v1/ask` del Nari AI Gateway con perfil **`vendedor`**.

El panel muestra tres cosas que devuelve el gateway:

- **Respuesta interna** (`answer`): precio, stock y alternativas para el vendedor.
- **Para el cliente** (`clientMessage`): texto listo para copiar.
- **Fuentes** (`sources`): nombre, precio, stock y enlace a la ficha web.

El gateway **consulta** catálogo y redacta. No crea pedidos, no aparta stock y no cambia precios. El POS tampoco debe inventar esos datos cuando el asesor falle.

---

## 2. Reglas de negocio

1. Toda consulta de este chat usa `profile: "vendedor"`. El navegador no elige el perfil. Si el body trae otro `profile` o `modelOverride`, el backend los ignora.
2. La clave `x-api-key` vive solo en el servidor (`GATEWAY_API_KEY`). No existe variable `VITE_*` con esa clave, ni se envía al frontend, ni se escribe en logs.
3. `question` tiene entre **3 y 600** caracteres (después de `trim`). El límite de 1000 del chat solo-UI queda reemplazado por 600 para coincidir con el gateway.
4. El POS mantiene un `sessionId` por consulta abierta. Formato: `pos:web:{consultaId}` con `consultaId` aleatorio. Longitud total entre 1 y 128 caracteres.
5. **Nueva consulta** genera otro `sessionId` y vacía la conversación (queda el mensaje de bienvenida). Cerrar el panel también descarta mensajes y, al volver a abrir, nace otro `sessionId`. Minimizar conserva mensajes y el mismo `sessionId`.
6. No se reutiliza ese `sessionId` para un perfil `cliente`. Este flujo no llama nunca con `cliente`.
7. Si la conversación se alarga, el gateway solo recuerda ~12 mensajes y el historial se pierde al reiniciar el gateway (TTL ~30 min). **Nueva consulta** es el reset del POS; no hay historial en MySQL.
8. `needsClarification` con perfil vendedor llega en `false`. No hay chips de repregunta.
9. `route`, `usage` y `toolCalls` no se reenvían al navegador ni se muestran al cajero.
10. `clientMessage` puede ser `null`. En ese caso se muestra `answer` y el aviso **Sin mensaje listo para el cliente**. No se inventa un texto comercial.
11. Ante catálogo caído (`PROVIDER_UNAVAILABLE`) el POS no muestra precios de memoria ni rellena el carrito con datos del chat.
12. El cajero no espera streaming. Una sola respuesta completa. El cliente HTTP del backend espera **60 s**. El axios del frontend ya usa 120 s y alcanza para cubrir esa espera.
13. Reintento automático, **una sola vez**, solo para `NO_GROUNDING` (422), `RATE_LIMITED` (429, esperar ~1,5 s) y `LLM_ERROR` (502). Sin reintento para 400, 401 y 503.
14. En error se registra `requestId` (y el `code`) en el log del backend. No se registra la pregunta, la respuesta ni la API key.
15. Mientras hay una pregunta en curso no se envía otra. El lector de barras sigue ignorando el panel (`data-no-barcode-scan`).

---

## 3. Alcance

### Incluye

- Proxy backend `POST /api/asesoria`.
- Variables `GATEWAY_URL` y `GATEWAY_API_KEY` en el backend.
- El panel pinta `answer`, `clientMessage` (con **Copiar**) y `sources`.
- Botón **Nueva consulta**.
- Estados de espera y de error legibles para el cajero.
- `sessionId` de la consulta abierta.
- Pruebas del proxy con el gateway simulado.

### No incluye

- Login de vendedor, caja o ticket (el POS aún no tiene esa identidad; el `sessionId` es `pos:web:{consultaId}`).
- Crear o editar pedidos, apartar stock, cambiar precios, descuentos, envíos o devoluciones.
- Llamar a WooCommerce desde este flujo.
- Streaming, voz, adjuntos, markdown enriquecido, varias conversaciones a la vez.
- Persistir el historial en MySQL, `localStorage` o Pinia.
- Mostrar `route`, `usage`, `toolCalls`.
- UI de aclaraciones (`needsClarification`).
- `GET /v1/tools` y pantalla de admin de perfiles.
- Subir el rate limit del gateway (~30 req/min por IP). Varios POS salen por la IP del backend; si hace falta más cupo, se pide en Hostinger, fuera de este cambio.
- Poner la API key en el build del frontend o en Hostinger desde este repositorio (en Hostinger la variable se carga en hPanel).

---

## 4. Arquitectura

```
ChatAsistentePanel (Vue)
        │  POST /api/asesoria   { question, sessionId }
        ▼
Backend POS (Express)          agrega profile=vendedor y x-api-key
        │  POST /v1/ask         timeout 60 s
        ▼
Nari AI Gateway                https://nariaigateway.nariuniverse.com
        perfil vendedor        WooCommerce + redactor
```

El navegador no llama a `nariaigateway.nariuniverse.com`.

---

## 5. Backend

### Variables de entorno

| Variable | Obligatoria para arrancar el POS | Uso |
|---|---|---|
| `GATEWAY_URL` | no | Base del gateway. Si falta: `https://nariaigateway.nariuniverse.com` |
| `GATEWAY_API_KEY` | no | Cabecera `x-api-key`. Si falta, el resto del POS arranca igual y `POST /api/asesoria` responde 503 |

`assertEnv()` **no** exige estas variables: ventas y catálogo no dependen del asesor.

Documentar ambas en `backend/.env.example`. No commitear la clave.

### `POST /api/asesoria`

**Request (desde el POS)**

```json
{
  "question": "cuánto vale el aceite de romero y cuántos quedan?",
  "sessionId": "pos:web:6f1c0b2e-4a7d-4e1a-9c33-0a1b2c3d4e5f"
}
```

Validación (zod):

| Campo | Regla |
|---|---|
| `question` | string, trim, longitud 3–600 |
| `sessionId` | string, longitud 1–128, patrón `^pos:web:[A-Za-z0-9-]+$` |

Body inválido → `400`:

```json
{ "error": "La pregunta debe tener entre 3 y 600 caracteres.", "code": "BAD_REQUEST" }
```

Si falta `GATEWAY_API_KEY` → `503`:

```json
{ "error": "El asesor no está configurado en el servidor.", "code": "ASESORIA_NO_CONFIGURADA" }
```

**Llamada al gateway**

```http
POST {GATEWAY_URL}/v1/ask
Content-Type: application/json
x-api-key: {GATEWAY_API_KEY}

{ "question": "...", "profile": "vendedor", "sessionId": "..." }
```

Timeout 60 s (`AbortSignal.timeout`). No enviar `locale` ni `modelOverride`.

**Response 200 al navegador** (solo estos campos):

```json
{
  "answer": "Nari Universe Aceite de Romero · $ 29.900 · 9 disponibles",
  "clientMessage": "Sí, tenemos el Aceite de Romero en $ 29.900 y hay disponible. ¿Te lo aparto?",
  "sources": [
    {
      "name": "Nari Universe Aceite de Romero",
      "url": "https://nariuniverse.com/product/aceite-de-romero",
      "price": "$ 29.900",
      "inStock": true,
      "stock": 9,
      "sku": null
    }
  ],
  "needsClarification": false,
  "requestId": "uuid-para-soporte"
}
```

- `answer`: string. Si el gateway no lo manda, tratar como error `LLM_ERROR`.
- `clientMessage`: string o `null`.
- `sources`: array. Si falta, `[]`. Conservar `name`, `url`, `price`, `inStock`, `stock`, `sku` tal como vengan (`stock` y `sku` pueden ser `null`).
- `needsClarification`: reenviar el booleano; el UI no lo usa para chips.
- `requestId`: string o `null`.

### Errores del gateway → POS

Formato único:

```json
{ "error": "texto para el cajero", "code": "RATE_LIMITED", "requestId": "..." }
```

| HTTP gateway | `code` | HTTP POS | Texto para el cajero | Reintento |
|---|---|---|---|---|
| 400 | `BAD_REQUEST` | 400 | La pregunta debe tener entre 3 y 600 caracteres. | no |
| 401 | `UNAUTHORIZED` | 502 | El asesor no está autorizado. Avisa a soporte. | no |
| 422 | `NO_GROUNDING` | 502 | No pude fundamentar la respuesta. Intenta reformular. | 1 vez, inmediato |
| 429 | `RATE_LIMITED` | 429 | El asesor está ocupado. Espera un momento e intenta de nuevo. | 1 vez, tras ~1,5 s |
| 502 | `LLM_ERROR` | 502 | El asesor no responde. Intenta de nuevo. | 1 vez, inmediato |
| 503 | `PROVIDER_UNAVAILABLE` | 503 | El catálogo no está disponible. No uses un precio de memoria. | no |
| timeout / red | `ASESOR_TIMEOUT` | 504 | La consulta tardó demasiado. Intenta de nuevo. | no |
| otro / JSON inválido | `ASESOR_ERROR` | 502 | El asesor no responde. Intenta de nuevo. | no |

El 401 del gateway no se traduce a 401 del POS: el cajero no tiene sesión contra el gateway, y un 401 local se confundiría con un fallo de login del POS.

Log de error: `[asesoria] code=<code> http=<status> requestId=<id>`.

### Salud (opcional, no bloquea el chat)

No hace falta un endpoint nuevo de health en el MVP. Si `POST /api/asesoria` falla, el panel muestra el mensaje de la tabla. Un `GET /health` directo desde el navegador al gateway queda fuera: el navegador no debe depender del gateway.

---

## 6. Frontend

Pieza existente: `frontend/src/components/ChatAsistentePanel.vue`, montada en `PosView.vue`.

Se mantienen el FAB, los estados `cerrado | abierto | minimizado`, `z-40`, `data-no-barcode-scan`, `Enter` envía y `Shift+Enter` es salto de línea, y el foco al abrir.

### Sesión

- Al montar el panel (abrir desde cerrado) se crea `sessionId = pos:web:{uuid}`.
- **Nueva consulta** (botón en la cabecera, `aria-label="Nueva consulta"`) reemplaza el uuid, borra mensajes y deja otra vez el mensaje de bienvenida.
- Minimizar no cambia el id. Cerrar desmonta el panel; la próxima apertura crea otro id.
- El id no se guarda en `localStorage`.

### Envío

`PosView.onChatEnviar` deja de ser un no-op. Flujo:

1. El panel agrega la burbuja del vendedor y emite `enviar` con `{ texto }`.
2. El padre pone `enviando=true` y llama `POST /api/asesoria` con `{ question: texto, sessionId }`.
3. Con 200, el panel agrega un mensaje `asistente` con `answer`, `clientMessage` y `sources`.
4. Con error, agrega un mensaje `asistente` marcado como error, con `error` del JSON (o “El asesor no responde. Intenta de nuevo.” si no hay body).
5. `enviando=false` en cualquier caso. Mientras tanto se ve “Escribiendo...” y Enviar queda deshabilitado.
6. Si el texto tiene menos de 3 caracteres, no hay HTTP: aviso local “Escribe al menos 3 caracteres.”

El `sessionId` lo posee el padre (`PosView`) y lo pasa como prop, para que **Nueva consulta** y el POST usen el mismo valor.

### Modelo de mensaje

```js
{
  id: string,
  autor: 'vendedor' | 'asistente',
  texto: string,          // vendedor: pregunta; asistente: answer (o texto de error)
  hora: string,
  clientMessage: string | null,
  sources: Array,
  esError: boolean
}
```

Los mensajes del vendedor no llevan `clientMessage` ni `sources`.

### Burbuja del asistente (éxito)

1. Etiqueta **Interno** y `texto` (`whitespace-pre-wrap`).
2. Etiqueta **Para el cliente**, el `clientMessage` y botón **Copiar** (`navigator.clipboard.writeText`). Al copiar, el botón muestra “Copiado” un momento. Si `clientMessage` es `null` o vacío: texto **Sin mensaje listo para el cliente** y sin botón Copiar.
3. Lista compacta de `sources`: `name`, `price`, stock y enlace.
   - Stock: si `stock` es número, “{n} disp.”; si `stock` es `null` y `inStock` es `true`, “Disponible”; si `inStock` es `false`, “Sin stock”; si no hay dato, no mostrar stock.
   - `sku` solo si viene informado.
   - `url` abre en pestaña nueva (`rel="noopener noreferrer"`). Si no hay `url`, el nombre va sin enlace.

### Burbuja de error

Texto del error, sin bloque “Para el cliente” y sin fuentes. Estilo distinto de la burbuja de éxito (borde o fondo de aviso), para que no parezca una ficha de producto.

### Cabecera

Además de minimizar y cerrar: **Nueva consulta**. No se agrega overlay. El POS (carrito, listado, modales `z-50`) sigue usable.

### Límite del textarea

`maxlength` 600. Placeholder sin cambio de tono: el vendedor escribe la consulta en español.

---

## 7. Seguridad

- La API key no viaja al bundle de Vite ni a `ChatAsistentePanel`.
- El backend no acepta una URL de gateway enviada por el cliente.
- No se reflejan al cajero cuerpos crudos del gateway ni stack traces.
- Copiar usa solo `clientMessage`, nunca `answer` (el interno puede traer stock y notas que no son para el cliente). El botón Copiar no existe cuando no hay `clientMessage`.

---

## 8. Pruebas

Backend (`backend/tests`), con `fetch` simulado:

1. Request válido → el gateway recibe `profile: "vendedor"`, la pregunta, el `sessionId` y la cabecera `x-api-key`. La respuesta al POS no incluye `route`, `usage` ni `toolCalls`.
2. Pregunta de 2 caracteres o de más de 600 → 400 y cero llamadas al gateway.
3. `sessionId` que no cumple `pos:web:…` → 400.
4. Sin `GATEWAY_API_KEY` → 503 `ASESORIA_NO_CONFIGURADA`.
5. Gateway 401 → 502 `UNAUTHORIZED` y log con `requestId`.
6. Gateway 422 y luego 200 → una repetición y respuesta 200.
7. Gateway 429 → una espera y un segundo intento; si el segundo también es 429, 429 al POS.
8. Gateway 503 → 503 `PROVIDER_UNAVAILABLE` sin reintento.
9. Timeout → 504 `ASESOR_TIMEOUT`.
10. `clientMessage: null` se reenvía como `null`.

No hace falta un test de UI automatizado en esta versión. La comprobación visual queda en los criterios de aceptación.

---

## 9. Criterios de aceptación

1. En el POS, el chat flotante sigue abriendo, minimizando y cerrando como en el spec de solo UI, con `data-no-barcode-scan`.
2. Enviar una pregunta de al menos 3 caracteres llama a `POST /api/asesoria` y no al dominio del gateway.
3. La burbuja del asistente muestra **Interno** (`answer`) y **Para el cliente** (`clientMessage`).
4. **Copiar** deja `clientMessage` en el portapapeles. Si `clientMessage` es `null`, se ve “Sin mensaje listo para el cliente” y no hay botón Copiar.
5. Cada fuente visible muestra nombre, precio y stock cuando el gateway los envió, y el enlace abre la ficha.
6. El cajero no ve modelo, tokens, costo ni herramientas.
7. **Nueva consulta** borra el hilo, deja la bienvenida y la siguiente pregunta usa otro `sessionId`. Minimizar conserva el hilo y el id.
8. Escribir en el chat no dispara el lector de barras.
9. Con el asesor tardando, se ve “Escribiendo...” y no se puede enviar otra pregunta hasta que termine.
10. Si el gateway responde 503, el texto advierte que el catálogo no está disponible y no aparece un precio inventado.
11. Sin `GATEWAY_API_KEY`, el POS arranca y el chat responde que el asesor no está configurado.
12. Una pregunta no queda registrada en el log; un error sí deja `requestId`.
13. `npm test` del backend cubre los casos de la sección 8. `npm run build` del frontend compila.

---

## 10. Fuera de alcance explícito

- Pedidos WooCommerce, reservas de stock, cambios de precio.
- Perfil `cliente` del gateway.
- Historial que sobreviva a un reinicio del gateway o a recargar el navegador.
- Identidad de caja o de ticket dentro del `sessionId` (queda preparado el prefijo `pos:web:`; cambiarlo cuando exista caja no cambia el contrato del gateway).
