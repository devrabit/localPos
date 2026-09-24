const test = require('node:test')
const assert = require('node:assert')
const express = require('express')
const request = require('supertest')
const createApiRouter = require('../src/routes/api')
const { askVendedor } = require('../src/services/asesoriaGateway')

const SESSION = 'pos:web:consulta-1'
const QUESTION = 'cuanto vale el aceite de romero'

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function buildApp(ask) {
  const app = express()
  app.use(express.json())
  app.use('/api', createApiRouter({}, { askVendedor: ask }))
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error?.message || 'fail' })
  })
  return app
}

function withGatewayEnv(apiKey, url, fn) {
  const prevKey = process.env.GATEWAY_API_KEY
  const prevUrl = process.env.GATEWAY_URL
  if (apiKey === undefined) delete process.env.GATEWAY_API_KEY
  else process.env.GATEWAY_API_KEY = apiKey
  if (url === undefined) delete process.env.GATEWAY_URL
  else process.env.GATEWAY_URL = url
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      if (prevKey === undefined) delete process.env.GATEWAY_API_KEY
      else process.env.GATEWAY_API_KEY = prevKey
      if (prevUrl === undefined) delete process.env.GATEWAY_URL
      else process.env.GATEWAY_URL = prevUrl
    })
}

test('askVendedor envia perfil vendedor y no reenvia telemetria', async () => {
  let captured
  const fetchImpl = async (url, init) => {
    captured = { url, init }
    return jsonResponse(200, {
      answer: 'Aceite · $ 29.900 · 9 disponibles',
      clientMessage: 'Si, hay aceite.',
      sources: [{ name: 'Aceite', url: 'https://nariuniverse.com/p', price: '$ 29.900', inStock: true, stock: 9, sku: null }],
      needsClarification: false,
      requestId: 'req-200',
      route: { tier: 'balanced' },
      usage: { costUsd: 1 },
      toolCalls: [{ name: 'woo' }],
    })
  }

  await withGatewayEnv('secret-key', 'https://gateway.test/', async () => {
    const result = await askVendedor(QUESTION, SESSION, { fetchImpl, log() {} })
    assert.equal(captured.url, 'https://gateway.test/v1/ask')
    assert.equal(captured.init.headers['x-api-key'], 'secret-key')
    assert.deepEqual(JSON.parse(captured.init.body), {
      question: QUESTION,
      profile: 'vendedor',
      sessionId: SESSION,
    })
    assert.equal(result.ok, true)
    assert.equal(result.answer, 'Aceite · $ 29.900 · 9 disponibles')
    assert.equal(result.clientMessage, 'Si, hay aceite.')
    assert.equal(result.sources[0].stock, 9)
    assert.equal(result.requestId, 'req-200')
    assert.equal(result.needsClarification, false)
    assert.equal('route' in result, false)
    assert.equal('usage' in result, false)
    assert.equal('toolCalls' in result, false)
  })
})

test('POST /api/asesoria rechaza pregunta corta o larga sin llamar al gateway', async () => {
  let calls = 0
  const app = buildApp(async () => {
    calls += 1
    return { ok: true }
  })
  const corta = await request(app).post('/api/asesoria').send({ question: 'ab', sessionId: SESSION }).expect(400)
  assert.equal(corta.body.code, 'BAD_REQUEST')
  assert.match(corta.body.error, /3 y 600/)
  const larga = await request(app)
    .post('/api/asesoria')
    .send({ question: 'a'.repeat(601), sessionId: SESSION })
    .expect(400)
  assert.equal(larga.body.code, 'BAD_REQUEST')
  assert.equal(calls, 0)
})

test('POST /api/asesoria rechaza sessionId fuera de pos:web', async () => {
  let calls = 0
  const app = buildApp(async () => {
    calls += 1
    return { ok: true }
  })
  const res = await request(app)
    .post('/api/asesoria')
    .send({ question: QUESTION, sessionId: 'pos:caja:1' })
    .expect(400)
  assert.equal(res.body.code, 'BAD_REQUEST')
  assert.match(res.body.error, /sesión/)
  assert.equal(calls, 0)
})

test('sin GATEWAY_API_KEY responde 503 y no llama al gateway', async () => {
  let calls = 0
  await withGatewayEnv(undefined, undefined, async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () => {
        calls += 1
        return jsonResponse(200, { answer: 'no' })
      },
      log() {},
    })
    assert.equal(result.ok, false)
    assert.equal(result.status, 503)
    assert.equal(result.code, 'ASESORIA_NO_CONFIGURADA')
    assert.equal(calls, 0)
  })
})

test('gateway 401 se traduce a 502 y el log lleva requestId sin la pregunta', async () => {
  const lines = []
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () =>
        jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'no', requestId: 'req-401' } }),
      log: (...args) => lines.push(args),
    })
    assert.equal(result.status, 502)
    assert.equal(result.code, 'UNAUTHORIZED')
    assert.equal(result.requestId, 'req-401')
    const dumped = JSON.stringify(lines)
    assert.match(dumped, /req-401/)
    assert.equal(dumped.includes(QUESTION), false)
    assert.equal(dumped.includes('secret-key'), false)
  })
})

test('422 y luego 200 reintenta una vez', async () => {
  let calls = 0
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () => {
        calls += 1
        if (calls === 1) {
          return jsonResponse(422, { error: { code: 'NO_GROUNDING', requestId: 'req-422' } })
        }
        return jsonResponse(200, { answer: 'fundamentada', clientMessage: 'listo', requestId: 'req-ok' })
      },
      log() {},
    })
    assert.equal(calls, 2)
    assert.equal(result.ok, true)
    assert.equal(result.answer, 'fundamentada')
    assert.equal(result.requestId, 'req-ok')
  })
})

test('429 persistente espera una vez y responde 429', async () => {
  let calls = 0
  let sleeps = 0
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () => {
        calls += 1
        return jsonResponse(429, { error: { code: 'RATE_LIMITED', requestId: 'req-429' } })
      },
      sleep: async () => {
        sleeps += 1
      },
      log() {},
    })
    assert.equal(calls, 2)
    assert.equal(sleeps, 1)
    assert.equal(result.status, 429)
    assert.equal(result.code, 'RATE_LIMITED')
  })
})

test('503 del catalogo no se reintenta', async () => {
  let calls = 0
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () => {
        calls += 1
        return jsonResponse(503, { error: { code: 'PROVIDER_UNAVAILABLE', requestId: 'req-503' } })
      },
      log() {},
    })
    assert.equal(calls, 1)
    assert.equal(result.status, 503)
    assert.equal(result.code, 'PROVIDER_UNAVAILABLE')
  })
})

test('timeout del gateway responde 504', async () => {
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () => {
        const error = new Error('The operation was aborted due to timeout')
        error.name = 'TimeoutError'
        throw error
      },
      log() {},
    })
    assert.equal(result.status, 504)
    assert.equal(result.code, 'ASESOR_TIMEOUT')
  })
})

test('clientMessage null se conserva', async () => {
  await withGatewayEnv('secret-key', 'https://gateway.test', async () => {
    const result = await askVendedor(QUESTION, SESSION, {
      fetchImpl: async () =>
        jsonResponse(200, {
          answer: 'Solo interno',
          clientMessage: null,
          requestId: 'req-null',
        }),
      log() {},
    })
    assert.equal(result.ok, true)
    assert.equal(result.clientMessage, null)
    assert.deepEqual(result.sources, [])
  })
})

test('POST /api/asesoria devuelve solo los campos del cajero', async () => {
  const app = buildApp(async () => ({
    ok: true,
    answer: 'interno',
    clientMessage: null,
    sources: [],
    needsClarification: false,
    requestId: 'req-ruta',
    route: { tier: 'balanced' },
    usage: { costUsd: 1 },
  }))
  const res = await request(app).post('/api/asesoria').send({ question: QUESTION, sessionId: SESSION }).expect(200)
  assert.deepEqual(res.body, {
    answer: 'interno',
    clientMessage: null,
    sources: [],
    needsClarification: false,
    requestId: 'req-ruta',
  })
})
