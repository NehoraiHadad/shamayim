import { vi } from 'vitest'
import { VOTE_ROUND, VOTE_STYLES } from '../../src/data/styleVoteRound'
import { handle, type Env } from '../src/index'
import type { VoteMeta } from '../src/voteTally'

/** The style that is not the default. */
export const [, DRAWN] = VOTE_STYLES
export const ORIGIN = 'https://app.test'
export const VOTE = 'https://w.test/v1/style-vote'
export const TOTALS = 'https://w.test/v1/style-votes'
const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext
const cache = { match: async () => undefined, put: async () => undefined } as unknown as Cache
export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
export const voteKey = (n: number, round: string = VOTE_ROUND) => `vote:${round}:${uuid(n)}`
export const today = () => new Date().toISOString().slice(0, 10)

/** KV in memory, `pageSize` keys a listing, as Cloudflare pages at 1000. */
function memoryKv(pageSize: number) {
  const data = new Map<string, { value: string; metadata?: VoteMeta; expirationTtl?: number }>()
  return {
    data,
    getWithMetadata: vi.fn(async (key: string) => ({ value: data.get(key)?.value ?? null, metadata: data.get(key)?.metadata ?? null })),
    put: vi.fn(async (key: string, value: string, o?: { metadata?: VoteMeta; expirationTtl?: number }) => { data.set(key, { value, ...o }) }),
    list: vi.fn(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
      const all = [...data].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata }))
      const from = Number(cursor ?? 0)
      const done = from + pageSize >= all.length
      return { keys: all.slice(from, from + pageSize), list_complete: done, cursor: done ? undefined : String(from + pageSize) }
    }),
  }
}

/** The Worker over an empty KV. */
export function voteWorker({ pageSize = 1000, env = {} }: { pageSize?: number; env?: Partial<Env> } = {}) {
  const kv = memoryKv(pageSize)
  const call = (url: string, init: RequestInit = {}) =>
    handle(new Request(url, init), { ALLOWED_ORIGINS: ORIGIN, LIVE: kv as unknown as KVNamespace, ...env }, ctx, cache)
  const post = (body: unknown, headers: Record<string, string> = {}) => call(VOTE, { method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
  return {
    kv,
    call,
    post,
    vote: (n: number, style: string, headers?: Record<string, string>) => post({ id: uuid(n), style, round: VOTE_ROUND }, headers),
    totals: async () => (await call(TOTALS)).json(),
    seed: (n: number, meta: VoteMeta) => kv.data.set(voteKey(n), { value: meta.style, metadata: meta }),
  }
}
