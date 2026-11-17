/**
 * Shamayim weather proxy: a shared, cached front for the three Open-Meteo endpoints the app uses, so the number of
 * requests to Open-Meteo follows the number of places rather than the number of users.
 */
import { checkOrigin, corsHeaders, parseOrigins, preflight } from './cors'
import { cacheKey, proxy } from './proxy'
import { routeFor } from './routes'
import { canonicalQuery } from './validate'

export interface Env {
  /** Comma-separated browser origins allowed to call the Worker. */
  ALLOWED_ORIGINS?: string
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
} satisfies ExportedHandler<Env>
