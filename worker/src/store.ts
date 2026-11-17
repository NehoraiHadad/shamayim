/** An upstream answer kept as plain data, so one copy can be turned into any number of Responses. */
export interface Stored {
  status: number
  body: string
  contentType: string
  /** When the Worker received this from Open-Meteo (epoch ms). */
  fetchedAt: number
}

/** Where shared copies live. The Worker uses the Cache API; tests pass an in-memory fake. */
export interface SharedCache {
  match(key: string): Promise<Response | undefined>
  put(key: string, response: Response): Promise<void>
}

const MEMORY_LIMIT = 300
/** Kept per isolate in front of the Cache API (which has no effect on *.workers.dev). Map order = insertion order. */
const memory = new Map<string, Stored>()

export function clearMemory(): void {
  memory.clear()
}

function remember(key: string, stored: Stored): void {
  memory.delete(key)
  memory.set(key, stored)
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string)
}

/**
 * The newest copy for `key`, or null. A fresh copy in this isolate's memory is used as is; otherwise the shared
 * cache is asked too, since another isolate may have stored a newer one.
 */
export async function readStored(cache: SharedCache, key: string, isFresh: (s: Stored) => boolean): Promise<Stored | null> {
  const local = memory.get(key) ?? null
  if (local && isFresh(local)) return local
  const shared = await matchShared(cache, key)
  if (!shared) return local
  if (local && local.fetchedAt >= shared.fetchedAt) return local
  remember(key, shared)
  return shared
}

async function matchShared(cache: SharedCache, key: string): Promise<Stored | null> {
  const res = await cache.match(key)
  if (!res) return null
  const fetchedAt = Number(res.headers.get('X-Fetched-At'))
  if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return null
  return {
    status: res.status,
    body: await res.text(),
    contentType: res.headers.get('Content-Type') ?? 'application/json',
    fetchedAt,
  }
}

/**
 * Keeps a successful answer. The Cache API entry lives as long as it may still be served stale; whether it is
 * fresh is decided from `X-Fetched-At`, not from the cache's own expiry.
 */
export async function writeStored(cache: SharedCache, key: string, stored: Stored, keepMs: number): Promise<void> {
  remember(key, stored)
  const maxAge = Math.floor(Math.min(keepMs, 365 * 24 * 3600 * 1000) / 1000)
  await cache.put(key, new Response(stored.body, {
    status: stored.status,
    headers: {
      'Content-Type': stored.contentType,
      'Cache-Control': `public, max-age=${maxAge}`,
      'X-Fetched-At': String(stored.fetchedAt),
    },
  }))
}
