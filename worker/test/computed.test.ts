import { beforeEach, expect, it, vi } from 'vitest'
import { cacheKey, proxy, type ProxyDeps } from '../src/proxy'
import { ROUTES } from '../src/routes'
import { clearMemory } from '../src/store'

beforeEach(clearMemory)

function setup() {
  const entries = new Map<string, Response>()
  const pending: Promise<unknown>[] = []
  let now = 1_000_000_000_000
  const fetchMock = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response('{"value":1}'))
  const deps: ProxyDeps = {
    cache: { match: async (key) => entries.get(key)?.clone(), put: async (key, value) => { entries.set(key, value) } },
    fetch: fetchMock, now: () => now, timeoutMs: 1000,
    waitUntil: (p) => { pending.push(p) },
  }
  const route = { ...ROUTES['/v1/normals'], upstreamQuery: (q: string) => `${q}&fixed=1`,
    transform: (body: string) => JSON.stringify({ reduced: JSON.parse(body).value }) }
  const query = 'latitude=32&longitude=35'
  const key = cacheKey('https://w.test', '/v1/normals', query)
  return { entries, fetchMock, route, key, settle: () => Promise.all(pending),
    advance: () => { now += route.freshMs }, call: () => proxy(route, query, key, deps) }
}

it('sends the computed upstream query and stores transformed output under the client key', async () => {
  const t = setup()
  expect(await (await t.call()).json()).toEqual({ reduced: 1 })
  await t.settle()
  expect(t.fetchMock.mock.calls[0][0]).toBe('https://archive-api.open-meteo.com/v1/archive?latitude=32&longitude=35&fixed=1')
  expect([...t.entries.keys()]).toEqual([t.key])
  clearMemory()
  const hit = await t.call()
  expect(hit.headers.get('X-Cache')).toBe('HIT')
  expect(await hit.json()).toEqual({ reduced: 1 })
  expect(t.fetchMock).toHaveBeenCalledTimes(1)
})

it('answers 502 for invalid transformed data and never caches it', async () => {
  const t = setup()
  t.route.transform = () => { throw new Error('bad') }
  const res = await t.call()
  expect(res.status).toBe(502)
  expect(await res.json()).toEqual({ error: true, reason: 'Upstream data invalid' })
  await t.settle()
  expect(t.entries.size).toBe(0)
  await t.call()
  expect(t.fetchMock).toHaveBeenCalledTimes(2)
})

it('prefers usable stale data when transformation fails', async () => {
  const t = setup()
  await t.call()
  await t.settle()
  t.advance()
  t.route.transform = () => { throw new Error('bad') }
  const res = await t.call()
  expect(res.headers.get('X-Cache')).toBe('STALE')
  expect(await res.json()).toEqual({ reduced: 1 })
})
