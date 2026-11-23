/**
 * Resilient IndexedDB + bounded LRU memory fallback store for living-land caching.
 * - Successful IDB writes are NOT duplicated in memory.
 * - Failed/aborted IDB writes/deletes fall back to a bounded in-memory LRU/tombstone map that stays
 *   authoritative over stale or missing IDB rows on subsequent reads.
 * - `openIdb` handles `onblocked` and a timeout so an upgrade lock never hangs remote refreshes.
 */

export interface LandCacheStore {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  del(key: string): Promise<void>
}

export interface IdbStoreOptions {
  dbName?: string; storeName?: string; maxMemoryEntries?: number; openTimeoutMs?: number
}

const DEFAULT_DB = 'shamayim-land-v1', DEFAULT_STORE = 'entries', DEFAULT_MAX_MEM = 12, DEFAULT_OPEN_TIMEOUT_MS = 1500

/** Bounded LRU in-memory cache store for unit tests and IndexedDB fallback. */
export function createMemoryStore(maxEntries = DEFAULT_MAX_MEM): LandCacheStore & { has(key: string): boolean; size(): number } {
  const map = new Map<string, unknown>()
  const limit = Math.max(1, maxEntries)
  return {
    has: (key) => map.has(key),
    size: () => map.size,
    async get(key) {
      if (!map.has(key)) return null
      const val = map.get(key)
      map.delete(key); map.set(key, val)
      return val ?? null
    },
    async set(key, value) {
      map.delete(key); map.set(key, value)
      while (map.size > limit) {
        const oldest = map.keys().next().value
        if (oldest === undefined) break
        map.delete(oldest)
      }
    },
    async del(key) { map.delete(key) },
  }
}

function openIdb(factory: IDBFactory, dbName: string, storeName: string, timeoutMs: number): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let settled = false
    const done = (db: IDBDatabase | null) => {
      if (settled) { db?.close?.(); return }
      settled = true; clearTimeout(timer); resolve(db)
    }
    const timer = setTimeout(() => done(null), timeoutMs)
    if (typeof (timer as { unref?: () => void }).unref === 'function') (timer as { unref: () => void }).unref()
    try {
      const req = factory.open(dbName, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) req.result.createObjectStore(storeName)
      }
      req.onsuccess = () => done(req.result)
      req.onerror = () => done(null)
      req.onblocked = () => done(null)
    } catch { done(null) }
  })
}

function runTx<T>(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<{ ok: boolean; value?: T }> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (res: { ok: boolean; value?: T }) => { if (!settled) { settled = true; resolve(res) } }
    try {
      const tx = db.transaction(storeName, mode)
      const req = fn(tx.objectStore(storeName))
      let result: T | undefined
      if (req) { req.onsuccess = () => { result = req.result }; req.onerror = () => finish({ ok: false }) }
      tx.oncomplete = () => finish({ ok: true, value: result })
      tx.onerror = () => finish({ ok: false })
      tx.onabort = () => finish({ ok: false })
    } catch { finish({ ok: false }) }
  })
}

/** Creates an IndexedDB-backed store with authoritative bounded memory fallback on any IDB failure. */
export function createIdbStore(factory: IDBFactory | undefined, opts: IdbStoreOptions = {}): LandCacheStore {
  const dbName = opts.dbName ?? DEFAULT_DB, storeName = opts.storeName ?? DEFAULT_STORE
  const maxMem = opts.maxMemoryEntries ?? DEFAULT_MAX_MEM, timeoutMs = opts.openTimeoutMs ?? DEFAULT_OPEN_TIMEOUT_MS
  const mem = createMemoryStore(maxMem)
  const tombstones = new Set<string>()
  const dbPromise = factory ? openIdb(factory, dbName, storeName, timeoutMs) : Promise.resolve(null)

  const markDeleted = (key: string) => {
    tombstones.delete(key); tombstones.add(key)
    while (tombstones.size > maxMem) {
      const oldest = tombstones.values().next().value
      if (oldest === undefined) break
      tombstones.delete(oldest)
    }
  }

  return {
    async get(key) {
      if (tombstones.has(key)) return null
      if (mem.has(key)) return mem.get(key)
      const db = await dbPromise
      if (!db) return null
      const res = await runTx<unknown>(db, storeName, 'readonly', (s) => s.get(key))
      return res.ok ? (res.value ?? null) : null
    },
    async set(key, value) {
      const db = await dbPromise
      if (db) {
        const res = await runTx(db, storeName, 'readwrite', (s) => { s.put(value, key) })
        if (res.ok) { await mem.del(key); tombstones.delete(key); return }
      }
      tombstones.delete(key)
      await mem.set(key, value)
    },
    async del(key) {
      await mem.del(key)
      const db = await dbPromise
      if (db) {
        const res = await runTx(db, storeName, 'readwrite', (s) => { s.delete(key) })
        if (res.ok) { tombstones.delete(key); return }
      }
      markDeleted(key)
    },
  }
}
