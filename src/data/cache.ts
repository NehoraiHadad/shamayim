import type { Forecast } from '../domain/types'

const VERSION = 'v1'
export const FRESH_MS = 15 * 60 * 1000
export const STALE_MS = 12 * 60 * 60 * 1000

const key = (placeId: string) => `shamayim:${VERSION}:${placeId}`

/** localStorage may be unavailable (private mode, quota); every access is guarded. */
export function readCache(placeId: string): Forecast | null {
  try {
    const raw = localStorage.getItem(key(placeId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Forecast
    return parsed?.placeId === placeId && Array.isArray(parsed.days) ? parsed : null
  } catch {
    return null
  }
}

export function writeCache(forecast: Forecast): void {
  try {
    localStorage.setItem(key(forecast.placeId), JSON.stringify(forecast))
  } catch {
    // Storage full or blocked: the app still works without the cache.
  }
}

export type Freshness = 'fresh' | 'aging' | 'stale'

export function freshnessOf(forecast: Forecast, now = Date.now()): Freshness {
  const age = now - forecast.fetchedAt
  if (age < FRESH_MS) return 'fresh'
  if (age < STALE_MS) return 'aging'
  return 'stale'
}
