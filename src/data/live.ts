import type { Place } from '../config/place'
import type { LiveAnomaly } from '../domain/correction/live'
import { liveUrl } from './weatherApi'

const MAX_AGE_MS = 3 * 3600_000

/**
 * The IMS stations' current forecast anomaly around the place, from the Worker; null without a Worker, far from
 * every station, or when the stations' reading is old. Never throws: the forecast stands without it.
 */
export async function fetchLive(place: Place, signal?: AbortSignal, now = Date.now()): Promise<LiveAnomaly | null> {
  const url = liveUrl(new URLSearchParams({ latitude: String(place.lat), longitude: String(place.lon) }))
  if (!url) return null
  try {
    const timeout = AbortSignal.timeout(5000)
    const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
    if (!res.ok) return null
    const body = await res.json() as { anomaly?: unknown; observedAt?: unknown }
    const { anomaly, observedAt } = body
    if (typeof anomaly !== 'number' || !Number.isFinite(anomaly) || typeof observedAt !== 'number') return null
    if (now - observedAt > MAX_AGE_MS || Math.abs(anomaly) > 6) return null
    return { anomaly, observedAt }
  } catch {
    return null
  }
}
