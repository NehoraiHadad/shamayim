import type { Route } from './routes'
import { readStored, writeStored, type SharedCache, type Stored } from './store'

export interface ProxyDeps {
  cache: SharedCache
  fetch: typeof fetch
  now: () => number
  waitUntil: (promise: Promise<unknown>) => void
  timeoutMs: number
}

/** HIT: shared copy younger than the route's fresh time. MISS: just fetched. STALE: older copy served on error. */
export type CacheStatus = 'HIT' | 'MISS' | 'STALE'

/** One upstream request per key at a time within this isolate; concurrent misses wait for the same answer. */
const inflight = new Map<string, Promise<Stored>>()

/** The cache key: route path + canonical query, on the Worker's own origin (Cache API keys must be URLs). */
export function cacheKey(origin: string, path: string, query: string): string {
  return `${origin}${path}?${query}`
}

async function fetchUpstream(route: Route, query: string, deps: ProxyDeps): Promise<Stored> {
  const res = await deps.fetch(`${route.upstream}?${query}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'shamayim-weather-worker' },
    signal: AbortSignal.timeout(deps.timeoutMs),
  })
  return {
    status: res.status,
    body: await res.text(),
    contentType: res.headers.get('Content-Type') ?? 'application/json',
    fetchedAt: deps.now(),
  }
}

/** Runs the upstream fetch once per key; the caller that started it (`leader`) stores the result. */
async function coalesced(key: string, run: () => Promise<Stored>): Promise<{ stored: Stored; leader: boolean }> {
  const pending = inflight.get(key)
  if (pending) return { stored: await pending, leader: false }
  const task = run().finally(() => inflight.delete(key))
  inflight.set(key, task)
  return { stored: await task, leader: true }
}

function respond(stored: Stored, status: CacheStatus, maxAgeS: number, staleReason?: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': stored.contentType,
    'X-Fetched-At': String(stored.fetchedAt),
    'X-Cache': status,
    'Cache-Control': maxAgeS > 0 ? `public, max-age=${maxAgeS}` : 'no-store',
  }
  if (staleReason) headers['X-Stale-Reason'] = staleReason
  return new Response(stored.body, { status: stored.status, headers })
}

function errorJson(status: number, reason: string): Response {
  return new Response(JSON.stringify({ error: true, reason }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

/** A refusal or outage that a cached copy should cover (429 = Open-Meteo's limit, 5xx = their trouble). */
const isUpstreamFailure = (status: number) => status === 429 || status >= 500

/** Shared cache → upstream (coalesced) → stale copy on failure → upstream refusal passed through unchanged. */
export async function proxy(route: Route, query: string, key: string, deps: ProxyDeps): Promise<Response> {
  const age = (s: Stored) => deps.now() - s.fetchedAt
  const cached = await readStored(deps.cache, key, (s) => age(s) < route.freshMs)
  const usable = cached && age(cached) <= route.staleMs ? cached : null
  if (cached && age(cached) < route.freshMs) {
    return respond(cached, 'HIT', Math.floor((route.freshMs - age(cached)) / 1000))
  }

  let result: { stored: Stored; leader: boolean }
  try {
    result = await coalesced(key, () => fetchUpstream(route, query, deps))
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
    if (usable) return respond(usable, 'STALE', 0, timedOut ? 'upstream timeout' : 'upstream unreachable')
    return timedOut ? errorJson(504, 'Upstream timeout') : errorJson(502, 'Upstream unreachable')
  }

  const { stored, leader } = result
  if (stored.status === 200) {
    if (leader) deps.waitUntil(writeStored(deps.cache, key, stored, route.staleMs).catch(() => undefined))
    return respond(stored, 'MISS', Math.floor(route.freshMs / 1000))
  }
  if (usable && isUpstreamFailure(stored.status)) return respond(usable, 'STALE', 0, `upstream ${stored.status}`)
  // No copy to fall back on: the app needs Open-Meteo's own status and `reason` to explain the failure.
  return respond(stored, 'MISS', 0)
}
