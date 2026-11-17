/** Headers the app reads from a response; browsers hide all others from cross-origin scripts. */
const EXPOSED = 'X-Fetched-At, X-Cache'

/** `ALLOWED_ORIGINS` is a comma-separated list, e.g. "https://app.example,http://localhost:5173". */
export function parseOrigins(value: string | undefined): Set<string> {
  return new Set((value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean))
}

export type OriginCheck = 'none' | 'allowed' | 'denied'

/** Requests without an Origin (curl, server-side) are not browser cross-origin calls and are let through. */
export function checkOrigin(origin: string | null, allowed: Set<string>): OriginCheck {
  if (origin === null) return 'none'
  return allowed.has(origin) ? 'allowed' : 'denied'
}

export function corsHeaders(origin: string | null, check: OriginCheck): Record<string, string> {
  const headers: Record<string, string> = { Vary: 'Origin' }
  if (check === 'allowed' && origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = EXPOSED
  }
  return headers
}

export function preflight(origin: string | null, check: OriginCheck): Response {
  if (check !== 'allowed') return new Response(null, { status: 403, headers: { Vary: 'Origin' } })
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin, check),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400',
    },
  })
}
