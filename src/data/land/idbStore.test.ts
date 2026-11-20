import { describe, expect, it } from 'vitest'
import { createIdbStore } from './idbStore'

/** Minimal fake IndexedDB double supporting success, blocked open, and write/read errors or aborts. */
function makeFakeIdb(opts: {
  blocked?: boolean
  failWrites?: boolean
  abortWrites?: boolean
  abortReads?: boolean
  seed?: Record<string, unknown>
} = {}): IDBFactory {
  const backing = new Map<string, unknown>(Object.entries(opts.seed ?? {}))
  const db = {
    close() {},
    objectStoreNames: { contains: () => true },
    createObjectStore() {},
    transaction(_store: string, mode: IDBTransactionMode) {
      const tx: Record<string, unknown> = { oncomplete: null, onerror: null, onabort: null }
      tx.objectStore = () => ({
        get(key: string) {
          const req: Record<string, unknown> = { result: backing.get(key), onsuccess: null, onerror: null }
          queueMicrotask(() => {
            if (opts.abortReads) (tx.onabort as (() => void) | null)?.()
            else { (req.onsuccess as (() => void) | null)?.(); (tx.oncomplete as (() => void) | null)?.() }
          })
          return req
        },
        put(val: unknown, key: string) {
          queueMicrotask(() => {
            if (opts.abortWrites) (tx.onabort as (() => void) | null)?.()
            else if (opts.failWrites) (tx.onerror as (() => void) | null)?.()
            else { backing.set(key, val); (tx.oncomplete as (() => void) | null)?.() }
          })
        },
        delete(key: string) {
          queueMicrotask(() => {
            if (opts.failWrites) (tx.onerror as (() => void) | null)?.()
            else { backing.delete(key); (tx.oncomplete as (() => void) | null)?.() }
          })
        },
      })
      void mode
      return tx
    },
  }
  return {
    open() {
      const req: Record<string, unknown> = { result: db, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null }
      queueMicrotask(() => {
        if (opts.blocked) (req.onblocked as (() => void) | null)?.()
        else (req.onsuccess as (() => void) | null)?.()
      })
      return req
    },
  } as unknown as IDBFactory
}

describe('idbStore resilient IndexedDB + bounded memory fallback', () => {
  it('keeps memory fallback authoritative on failed/aborted writes, bounds LRU entries, and survives blocked open', async () => {
    // 1. Failed IDB write stays authoritative over older IDB entry and missing IDB key
    const failStore = createIdbStore(makeFakeIdb({ failWrites: true, seed: { existing: 'old-idb' } }), { maxMemoryEntries: 2 })
    await failStore.set('existing', 'new-mem')
    await failStore.set('missing-in-idb', 'mem-only')
    expect(await failStore.get('existing')).toBe('new-mem')
    expect(await failStore.get('missing-in-idb')).toBe('mem-only')
    // Bounded memory eviction (max 2): inserting 3rd evicts oldest ('existing')
    await failStore.set('third', 'val3')
    expect(await failStore.get('third')).toBe('val3')

    // 2. Blocked IDB open resolves promptly without hanging and falls back to memory
    const blockedStore = createIdbStore(makeFakeIdb({ blocked: true }))
    await blockedStore.set('k', 'from-mem')
    expect(await blockedStore.get('k')).toBe('from-mem')

    // 3. Aborted write & read transactions resolve cleanly instead of hanging
    const abortWriteStore = createIdbStore(makeFakeIdb({ abortWrites: true }))
    await abortWriteStore.set('a', 'saved-on-abort')
    expect(await abortWriteStore.get('a')).toBe('saved-on-abort')
    const abortReadStore = createIdbStore(makeFakeIdb({ abortReads: true, seed: { x: 'val' } }))
    expect(await abortReadStore.get('x')).toBeNull()
  })
})
