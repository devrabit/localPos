const { readGatewayEnv } = require('../config/env')

const MENSAJES = {
  BAD_REQUEST: 'La pregunta debe tener entre 3 y 600 caracteres.',
  UNAUTHORIZED: 'El asesor no está autorizado. Avisa a soporte.',
  NO_GROUNDING: 'No pude fundamentar la respuesta. Intenta reformular.',
  RATE_LIMITED: 'El asesor está ocupado. Espera un momento e intenta de nuevo.',
  LLM_ERROR: 'El asesor no responde. Intenta de nuevo.',
  PROVIDER_UNAVAILABLE: 'El catálogo no está disponible. No uses un precio de memoria.',
  ASESOR_TIMEOUT: 'La consulta tardó demasiado. Intenta de nuevo.',
  ASESOR_ERROR: 'El asesor no responde. Intenta de nuevo.',
  ASESORIA_NO_CONFIGURADA: 'El asesor no está configurado en el servidor.',
}

const POR_STATUS = {
  400: { code: 'BAD_REQUEST', status: 400, retry: false, wait: false },
  401: { code: 'UNAUTHORIZED', status: 502, retry: false, wait: false },
  422: { code: 'NO_GROUNDING', status: 502, retry: true, wait: false },
  429: { code: 'RATE_LIMITED', status: 429, retry: true, wait: true },
  502: { code: 'LLM_ERROR', status: 502, retry: true, wait: false },
  503: { code: 'PROVIDER_UNAVAILABLE', status: 503, retry: false, wait: false },
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fallo(code, status, requestId, extra = {}) {
  return {
    ok: false,
    status,
    code,
    error: MENSAJES[code] || MENSAJES.ASESOR_ERROR,
    requestId: requestId || null,
    ...extra,
  }
}

function requestIdFrom(body) {
  if (!body || typeof body !== 'object') return null
  if (typeof body.requestId === 'string') return body.requestId
  if (typeof body.error?.requestId === 'string') return body.error.requestId
  return null
}

function mapSource(source) {
  if (!source || typeof source !== 'object') return null
  return {
    name: source.name ?? null,
    url: source.url ?? null,
    price: source.price ?? null,
    inStock: typeof source.inStock === 'boolean' ? source.inStock : null,
    stock: source.stock ?? null,
    sku: source.sku ?? null,
  }
}

function mapHttpError(status, body) {
  const known = POR_STATUS[status]
  const requestId = requestIdFrom(body)
  if (!known) return fallo('ASESOR_ERROR', 502, requestId, { retry: false, wait: false })
  return fallo(known.code, known.status, requestId, { retry: known.retry, wait: known.wait })
}

function mapSuccess(body) {
  const requestId = requestIdFrom(body)
  if (typeof body?.answer !== 'string' || body.answer.trim() === '') {
    return fallo('LLM_ERROR', 502, requestId, { retry: false, wait: false })
  }
  return {
    ok: true,
    answer: body.answer,
    clientMessage: typeof body.clientMessage === 'string' ? body.clientMessage : null,
    sources: Array.isArray(body.sources) ? body.sources.map(mapSource).filter(Boolean) : [],
    needsClarification: body.needsClarification === true,
    requestId,
  }
}

function report(log, result) {
  log('[asesoria] code=%s http=%s requestId=%s', result.code, result.status, result.requestId)
}

function publico(result) {
  if (result.ok) {
    return {
      ok: true,
      answer: result.answer,
      clientMessage: result.clientMessage,
      sources: result.sources,
      needsClarification: result.needsClarification,
      requestId: result.requestId,
    }
  }
  return {
    ok: false,
    status: result.status,
    code: result.code,
    error: result.error,
    requestId: result.requestId,
  }
}

async function unIntento({ url, apiKey, question, sessionId, fetchImpl }) {
  let response
  try {
    response = await fetchImpl(`${url}/v1/ask`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        question,
        profile: 'vendedor',
        sessionId,
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch {
    return fallo('ASESOR_TIMEOUT', 504, null, { retry: false, wait: false })
  }

  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (response.ok) return mapSuccess(body)
  return mapHttpError(response.status, body)
}

async function askVendedor(question, sessionId, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch
  const sleep = deps.sleep || defaultSleep
  const readEnv = deps.readEnv || readGatewayEnv
  const log = deps.log || console.error
  const { url, apiKey } = readEnv()

  if (!apiKey) {
    const result = fallo('ASESORIA_NO_CONFIGURADA', 503, null)
    report(log, result)
    return publico(result)
  }

  let result = await unIntento({ url, apiKey, question, sessionId, fetchImpl })
  if (!result.ok) report(log, result)
  if (!result.ok && result.retry) {
    if (result.wait) await sleep(1500)
    result = await unIntento({ url, apiKey, question, sessionId, fetchImpl })
    if (!result.ok) report(log, result)
  }
  return publico(result)
}

module.exports = {
  askVendedor,
  MENSAJES,
}
