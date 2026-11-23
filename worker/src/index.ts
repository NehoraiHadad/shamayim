/**
 * Shamayim weather proxy: a shared, cached front for the three Open-Meteo endpoints the app uses, so the number of
 * requests to Open-Meteo follows the number of places rather than the number of users.
 */
import { checkOrigin, corsHeaders, parseOrigins, preflight } from './cors'
import { liveFor, refreshLive, type LiveRun } from './live'
import { cacheKey, proxy } from './proxy'
import { routeFor } from './routes'
import { canonicalQuery } from './validate'

export interface Env {
  /** Comma-separated browser origins allowed to call the Worker. */
  ALLOWED_ORIGINS?: string
  /** IMS (Israel Meteorological Service) API token, a secret: `wrangler secret put IMS_TOKEN`. */
  IMS_TOKEN?: string
  /** Where the hourly live-correction run is kept (`wrangler.toml` [[kv_namespaces]]). */
  LIVE?: KVNamespace
}

/** The latest live run, kept per isolate for a few minutes so `/v1/live` does not read KV on every request. */
let liveMemo: { run: LiveRun | null; readAt: number } | null = null
const LIVE_MEMO_MS = 5 * 60_000

async function liveRun(env: Env, now: number): Promise<LiveRun | null> {
  if (!env.LIVE) return null
  if (liveMemo && now - liveMemo.readAt < LIVE_MEMO_MS) return liveMemo.run
  const raw = await env.LIVE.get('live')
  liveMemo = { run: raw ? (JSON.parse(raw) as LiveRun) : null, readAt: now }
  return liveMemo.run
}

export function clearLiveMemo(): void {
  liveMemo = null
}

/** `/v1/live?latitude=…&longitude=…`: the network's current forecast anomaly around a place (see live.ts). */
async function live(url: URL, env: Env): Promise<Response> {
  const latText = url.searchParams.get('latitude')
  const lonText = url.searchParams.get('longitude')
  const lat = Number(latText)
  const lon = Number(lonText)
  if (!latText || !lonText || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return plain(400, 'latitude and longitude are required')
  }
  const now = Date.now()
  const answer = liveFor(await liveRun(env, now), lat, lon, now)
  return new Response(JSON.stringify(answer), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  })
}

const UPSTREAM_TIMEOUT_MS = 10_000

function withHeaders(res: Response, extra: Record<string, string>): Response {
  const out = new Response(res.body, res)
  for (const [name, value] of Object.entries(extra)) out.headers.set(name, value)
  return out
}

function plain(status: number, reason: string): Response {
  return new Response(JSON.stringify({ error: true, reason }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function handle(request: Request, env: Env, ctx: ExecutionContext, cache: Cache): Promise<Response> {
  const origin = request.headers.get('Origin')
  const check = checkOrigin(origin, parseOrigins(env.ALLOWED_ORIGINS))
  if (request.method === 'OPTIONS') return preflight(origin, check)
  const cors = corsHeaders(origin, check)
  // A disallowed site's browser would still send a simple GET; refuse it before it spends upstream quota.
  if (check === 'denied') return withHeaders(plain(403, 'Origin not allowed'), cors)
  if (request.method !== 'GET') return withHeaders(plain(405, 'Method not allowed'), { ...cors, Allow: 'GET, OPTIONS' })

  const url = new URL(request.url)
  if (url.pathname === '/v1/live') return withHeaders(await live(url, env), cors)
  const route = routeFor(url.pathname)
  if (!route) return withHeaders(plain(404, 'Not found'), cors)
  const checked = canonicalQuery(route, url.searchParams)
  if (!checked.ok) return withHeaders(plain(400, checked.reason), cors)

  const response = await proxy(route, checked.query, cacheKey(url.origin, url.pathname, checked.query), {
    cache: { match: (key) => cache.match(key), put: (key, res) => cache.put(key, res) },
    fetch: (input, init) => fetch(input, init),
    now: Date.now,
    waitUntil: (promise) => ctx.waitUntil(promise),
    timeoutMs: UPSTREAM_TIMEOUT_MS,
  })
  return withHeaders(response, cors)
}

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx, caches.default)
  },
  /** Hourly (wrangler.toml [triggers]): read the IMS stations and store the live anomalies. */
  scheduled(_event, env, ctx) {
    const kv = env.LIVE
    const token = env.IMS_TOKEN
    if (!kv || !token) {
      console.warn('[live] skipped: LIVE KV namespace or IMS_TOKEN secret missing')
      return
    }
    ctx.waitUntil(refreshLive({ kv, token, fetch: (i, init) => fetch(i, init), now: Date.now })
      .then((run) => console.log(`[live] ${run.stations.length} stations`)))
  },
} satisfies ExportedHandler<Env>
