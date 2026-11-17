import { MAX_ELEVATION_POINTS, type ParamSpec, type Route } from './routes'

export type QueryResult = { ok: true; query: string } | { ok: false; reason: string }

// JavaScript's String(number) form, which can use an exponent near 0 (e.g. "1e-7").
const NUMBER = /^-?\d{1,3}(\.\d{1,20})?(e-?\d{1,3})?$/i
const TIMEZONE = /^(auto|GMT|UTC|[A-Za-z]+(\/[A-Za-z0-9_+-]+){1,2})$/
const LIMIT = { lat: 90, lon: 180 }

/**
 * Coordinates are rounded to 4 decimals (~11 m): far below the models' grid and the elevation map's 90 m cells,
 * and it lets near-identical requests share one cache entry.
 */
function coord(raw: string, axis: 'lat' | 'lon'): string | null {
  if (!NUMBER.test(raw)) return null
  const value = Number(raw)
  if (!Number.isFinite(value) || Math.abs(value) > LIMIT[axis]) return null
  return String(Math.round(value * 1e4) / 1e4)
}

/** The canonical form of one value, or null when it is not allowed. */
function checkValue(raw: string, spec: ParamSpec): string | null {
  switch (spec.kind) {
    case 'coord':
      return coord(raw, spec.axis)
    case 'coordList': {
      const parts = raw.split(',')
      if (parts.length > MAX_ELEVATION_POINTS) return null
      const values = parts.map((part) => coord(part, spec.axis))
      return values.every((v) => v !== null) ? values.join(',') : null
    }
    case 'int': {
      if (!/^\d{1,2}$/.test(raw)) return null
      const value = Number(raw)
      return value >= spec.min && value <= spec.max ? String(value) : null
    }
    case 'enum':
      return spec.values.includes(raw) ? raw : null
    case 'list': {
      const items = raw.split(',')
      const unique = new Set(items)
      return unique.size === items.length && items.every((item) => spec.values.includes(item)) ? raw : null
    }
    case 'timezone':
      return raw.length <= 64 && TIMEZONE.test(raw) ? raw : null
  }
}

/**
 * Checks a request's query against its route and returns it in canonical form: allowlisted parameters only, each
 * once, in the route's fixed order. This is the cache key; computed routes may expand it upstream.
 */
export function canonicalQuery(route: Route, params: URLSearchParams): QueryResult {
  const seen = new Set<string>()
  for (const name of params.keys()) {
    if (!Object.hasOwn(route.params, name)) return { ok: false, reason: `Parameter not allowed: ${name}` }
    if (seen.has(name)) return { ok: false, reason: `Parameter repeated: ${name}` }
    seen.add(name)
  }
  for (const name of route.required) {
    if (!seen.has(name)) return { ok: false, reason: `Missing parameter: ${name}` }
  }
  const out = new URLSearchParams()
  for (const [name, spec] of Object.entries(route.params)) {
    const raw = params.get(name)
    if (raw === null) continue
    const value = checkValue(raw, spec)
    if (value === null) return { ok: false, reason: `Invalid value for ${name}` }
    out.set(name, value)
  }
  if (route.name === 'elevation') {
    const count = (name: string) => out.get(name)?.split(',').length
    if (count('latitude') !== count('longitude')) {
      return { ok: false, reason: 'latitude and longitude need the same number of points' }
    }
  }
  return { ok: true, query: out.toString() }
}
