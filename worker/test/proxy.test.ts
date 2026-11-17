import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheKey, proxy, type ProxyDeps } from '../src/proxy'
import { ROUTES } from '../src/routes'
import { clearMemory, type SharedCache } from '../src/store'

const route = ROUTES['/v1/forecast']
const query = 'latitude=32.348&longitude=35.5'
const key = cacheKey('https://w.test', '/v1/forecast', query)
const MIN = 60_000

/** A Map-backed stand-in for caches.default. */
function fakeCache(): SharedCache & { entries: Map<string, Response> } {
  const entries = new Map<string, Response>()
  return {
    entries,
    match: async (k) => entries.get(k)?.clone(),
    put: async (k, res) => { entries.set(k, res) },
  }
}

function setup(upstream: () => Promise<Response>) {
  const cache = fakeCache()
  const pending: Promise<unknown>[] = []
  let now = 1_000_000_000_000
  const fetchMock = vi.fn(upstream)
  const deps: ProxyDeps = {
    cache,
    fetch: fetchMock as unknown as typeof fetch,
    now: () => now,
    waitUntil: (p) => { pending.push(p) },
    timeoutMs: 1000,
  }
  return {
    cache, deps, fetchMock,
    advance: (ms: number) => { now += ms },
    settle: () => Promise.all(pending),
    call: () => proxy(route, query, key, deps),
  }
}

const ok = () => Promise.resolve(new Response('{"t":1}', { status: 200, headers: { 'Content-Type': 'application/json' } }))
const limit = () => Promise.resolve(new Response('{"error":true,"reason":"Daily API request limit exceeded"}', { status: 429 }))

beforeEach(() => clearMemory())

describe('proxy', () => {
  it('fetches once, then serves the shared copy with the original X-Fetched-At', async () => {
    const t = setup(ok)
    const first = await t.call()
    await t.settle()
    t.advance(14 * MIN)
    clearMemory() // as if another isolate answered: only the shared cache is left
    const second = await t.call()
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
    expect(first.headers.get('X-Cache')).toBe('MISS')
    expect(second.headers.get('X-Cache')).toBe('HIT')
    expect(second.headers.get('X-Fetched-At')).toBe(first.headers.get('X-Fetched-At'))
    expect(await second.text()).toBe('{"t":1}')
    expect(second.headers.get('Cache-Control')).toBe('public, max-age=60')
  })

  it('asks upstream again once the copy is older than the fresh time', async () => {
    const t = setup(ok)
    await t.call()
    t.advance(15 * MIN)
    expect((await t.call()).headers.get('X-Cache')).toBe('MISS')
    expect(t.fetchMock).toHaveBeenCalledTimes(2)
  })

  it('serves a stale copy when Open-Meteo refuses, and marks it', async () => {
    const t = setup(ok)
    const first = await t.call()
    await t.settle()
    t.fetchMock.mockImplementation(limit)
    t.advance(3 * 60 * MIN)
    const res = await t.call()
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Cache')).toBe('STALE')
    expect(res.headers.get('X-Stale-Reason')).toBe('upstream 429')
    expect(res.headers.get('X-Fetched-At')).toBe(first.headers.get('X-Fetched-At'))
  })

  it('passes the refusal through once the copy is past the stale limit', async () => {
    const t = setup(ok)
    await t.call()
    await t.settle()
    t.fetchMock.mockImplementation(limit)
    t.advance(13 * 60 * MIN)
    const res = await t.call()
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: true, reason: 'Daily API request limit exceeded' })
  })

  it('passes a refusal through unchanged and does not cache it', async () => {
    const t = setup(limit)
    const res = await t.call()
    await t.settle()
    expect(res.status).toBe(429)
    expect((await res.json() as { reason: string }).reason).toBe('Daily API request limit exceeded')
    expect(t.cache.entries.size).toBe(0)
  })

  it('answers a timeout with 504 and a reason when nothing is cached', async () => {
    const t = setup(() => Promise.reject(new DOMException('timed out', 'TimeoutError')))
    const res = await t.call()
    expect(res.status).toBe(504)
    expect(await res.json()).toEqual({ error: true, reason: 'Upstream timeout' })
  })

  it('coalesces concurrent misses into one upstream request', async () => {
    let release: () => void = () => undefined
    const t = setup(() => new Promise<Response>((resolve) => { release = () => resolve(new Response('{"t":2}')) }))
    const calls = Promise.all([t.call(), t.call(), t.call()])
    await vi.waitFor(() => expect(t.fetchMock).toHaveBeenCalledTimes(1))
    release()
    const results = await calls
    await t.settle()
    expect(t.fetchMock).toHaveBeenCalledTimes(1)
    expect(await Promise.all(results.map((r) => r.text()))).toEqual(['{"t":2}', '{"t":2}', '{"t":2}'])
    expect(t.cache.entries.size).toBe(1)
  })

  it('keeps elevation stale copies at any age', async () => {
    const t = setup(ok)
    const elevation = ROUTES['/v1/elevation']
    await proxy(elevation, 'latitude=1&longitude=1', 'k', t.deps)
    await t.settle()
    t.fetchMock.mockImplementation(() => Promise.resolve(new Response('', { status: 503 })))
    t.advance(400 * 24 * 60 * MIN)
    expect((await proxy(elevation, 'latitude=1&longitude=1', 'k', t.deps)).headers.get('X-Cache')).toBe('STALE')
  })
})
