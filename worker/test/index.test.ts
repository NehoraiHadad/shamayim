import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handle } from '../src/index'
import { clearMemory } from '../src/store'

const env = { ALLOWED_ORIGINS: 'https://app.test, http://localhost:5173' }
const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext
const cache = { match: async () => undefined, put: async () => undefined } as unknown as Cache
const URL_OK = 'https://w.test/v1/air-quality?latitude=32.3&longitude=35.5'

function call(url: string, init: RequestInit = {}) {
  return handle(new Request(url, init), env, ctx, cache)
}

beforeEach(() => {
  clearMemory()
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"a":1}', { headers: { 'Content-Type': 'application/json' } })))
})

describe('handle', () => {
  it('serves an allowed origin with CORS and exposed freshness headers', async () => {
    const res = await call(URL_OK, { headers: { Origin: 'https://app.test' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test')
    expect(res.headers.get('Access-Control-Expose-Headers')).toContain('X-Fetched-At')
    expect(Number(res.headers.get('X-Fetched-At'))).toBeGreaterThan(0)
  })

  it('refuses a disallowed origin before calling upstream', async () => {
    const res = await call(URL_OK, { headers: { Origin: 'https://evil.test' } })
    expect(res.status).toBe(403)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('answers preflight for allowed origins only', async () => {
    const allowed = await call(URL_OK, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } })
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    const denied = await call(URL_OK, { method: 'OPTIONS', headers: { Origin: 'https://evil.test' } })
    expect(denied.status).toBe(403)
  })

  it('serves the optional comet feed without calling an upstream source per request', async () => {
    const res = await call('https://w.test/v1/comets', { headers: { Origin: 'https://app.test' } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://app.test')
    expect(await res.json()).toMatchObject({ version: 1, collectedAt: null, tracks: [] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 404, 400 and 405 without calling upstream', async () => {
    expect((await call('https://w.test/v1/search?name=x')).status).toBe(404)
    expect((await call(`${URL_OK}&apikey=1`)).status).toBe(400)
    expect((await call(URL_OK, { method: 'POST', body: 'x' })).status).toBe(405)
    expect(fetch).not.toHaveBeenCalled()
  })
})
