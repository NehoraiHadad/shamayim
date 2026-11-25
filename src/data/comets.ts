import { cometFeedOf, type CometTrack } from '../events/cometFeed'

const EMPTY: readonly CometTrack[] = []
const REFRESH_MS = 15 * 60_000
const RETRY_MS = 5 * 60_000

let shared: { retryAt: number; value: Promise<unknown> } | null = null

/** A shared sky-wide observation feed. Weather and predictable events remain usable during an outage. */
export async function fetchComets(now = Date.now()): Promise<readonly CometTrack[]> {
  const root = import.meta.env.VITE_WEATHER_API_BASE?.trim().replace(/\/+$/, '')
  if (!root) return EMPTY
  if (!shared || now >= shared.retryAt) {
    const value = fetch(`${root}/v1/comets`, { signal: AbortSignal.timeout(4000) })
      .then((response) => response.ok ? response.json() : null).catch(() => null)
    const entry = { retryAt: now + REFRESH_MS, value }
    shared = entry
    void value.then((payload) => { if (!payload) entry.retryAt = now + RETRY_MS })
  }
  return cometFeedOf(await shared.value, now)?.tracks ?? EMPTY
}
