/** Headers the app reads from a response; browsers hide all others from cross-origin scripts. */
const EXPOSED = 'X-Fetched-At, X-Cache'

/** `ALLOWED_ORIGINS` is a comma-separated list, e.g. "https://app.example,http://localhost:5173". */
export function parseOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean))
}

export type OriginCheck = 'none' | 'allowed' | 'denied'

/** An entry like "https://*.shamayim.pages.dev" allows any one-level subdomain (Pages preview builds). */
function matches(origin: string, entry: string): boolean {
  if (origin === entry) return true
  const star = entry.indexOf('://*.')
  if (star < 0) return false
  const scheme = entry.slice(0, star + 3)
  const suffix = entry.slice(star + 4)
  if (!origin.startsWith(scheme) || !origin.endsWith(suffix)) return false
  const label = origin.slice(scheme.length, origin.length - suffix.length)
  return /^[a-z0-9-]+$/i.test(label)
}

/** Requests without an Origin (curl, server-side) are not browser cross-origin calls and are let through. */
export function checkOrigin(origin: string | null, allowed: Set<string>): OriginCheck {
  if (origin === null) return 'none'
  for (const entry of allowed) if (matches(origin, entry)) return 'allowed'
  return 'denied'
}

export function corsHeaders(origin: string | null, check: OriginCheck): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (check === 'allowed' && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = EXPOSED
  }
  return headers
}

/** The one POST route (the style vote) takes JSON, so its preflight also allows the Content-Type header. */
export function preflight(origin: string | null, check: OriginCheck, method: 'GET' | 'POST' = 'GET'): Response {
  if (check !== 'allowed') return new Response(null, { status: 403, headers: { Vary: 'Origin' } })
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin, check),
      'Access-Control-Allow-Methods': `${method}, OPTIONS`,
      ...(method === 'POST' ? { 'Access-Control-Allow-Headers': 'Content-Type' } : {}),
      'Access-Control-Max-Age': '86400',
    },
  })
}
