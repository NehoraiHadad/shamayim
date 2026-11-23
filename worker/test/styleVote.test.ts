import { beforeEach, describe, expect, it, vi } from 'vitest'
import { handle } from '../src/index'
import { clearVoteMemory, DAILY_CHANGES, DAILY_WRITES } from '../src/styleVote'
import type { VoteMeta } from '../src/voteTally'

const ORIGIN = 'https://app.test'
const VOTE = 'https://w.test/v1/style-vote'
const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext
const cache = { match: async () => undefined, put: async () => undefined } as unknown as Cache
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const today = () => new Date().toISOString().slice(0, 10)

/** KV in memory, `pageSize` keys a listing, as Cloudflare pages at 1000. */
function voteKv(pageSize = 1000) {
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

let kv: ReturnType<typeof voteKv>
const call = (url: string, init: RequestInit = {}) =>
  handle(new Request(url, init), { ALLOWED_ORIGINS: ORIGIN, LIVE: kv as unknown as KVNamespace }, ctx, cache)
const post = (body: unknown, headers: Record<string, string> = {}) => call(VOTE, { method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) })
const totals = async () => (await call('https://w.test/v1/style-votes')).json()
const seed = (n: number, meta: VoteMeta) => kv.data.set(`vote:${uuid(n)}`, { value: meta.style, metadata: meta })

beforeEach(() => {
  clearVoteMemory()
  kv = voteKv()
})

describe('POST /v1/style-vote', () => {
  it('keeps the vote in metadata for a year, and nothing about the voter', async () => {
    const res = await post({ id: uuid(1), style: 'drawn' }, { 'CF-Connecting-IP': '203.0.113.9' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect([...kv.data]).toEqual([[`vote:${uuid(1)}`, { value: 'drawn', expirationTtl: 365 * 24 * 3600,
      metadata: { style: 'drawn', day: today(), n: 1 } }]])
  })

  it('replaces the vote of the same id, also back within KV’s read delay', async () => {
    for (const style of ['real', 'drawn', 'real']) await post({ id: uuid(1), style })
    expect(kv.data.size).toBe(1)
    expect(kv.data.get(`vote:${uuid(1)}`)?.metadata).toMatchObject({ style: 'real', n: 3 })
    expect(await totals()).toEqual({ real: 1, drawn: 0 })
  })

  it('does not write a vote that is already stored', async () => {
    seed(1, { style: 'real', day: '2026-01-01', n: 1 })
    expect((await post({ id: uuid(1), style: 'real' })).status).toBe(204)
    expect(kv.put).not.toHaveBeenCalled()
    expect(kv.list).not.toHaveBeenCalled()
  })

  it('refuses bad bodies without touching KV', async () => {
    const bad = ['', 'x', '[]', 'null', { id: uuid(1) }, { id: 'me', style: 'real' }, { id: uuid(1), style: 'other' },
      { id: uuid(1), style: 'real', name: 'x' }]
    for (const body of bad) expect((await post(body)).status, JSON.stringify(body)).toBe(400)
    expect((await post({ id: uuid(1), style: 'real', pad: 'x'.repeat(300) })).status).toBe(413)
    expect((await post({ id: uuid(1), style: 'real' }, { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect(kv.getWithMetadata).not.toHaveBeenCalled()
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('needs an allowed Origin, and POST', async () => {
    const body = JSON.stringify({ id: uuid(1), style: 'real' })
    const headers = { 'Content-Type': 'application/json' }
    expect((await call(VOTE, { method: 'POST', headers, body })).status).toBe(403)
    expect((await call(VOTE, { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body })).status).toBe(403)
    const get = await call(VOTE, { headers: { Origin: ORIGIN } })
    expect(get.status).toBe(405)
    expect(get.headers.get('Allow')).toBe('POST, OPTIONS')
    expect(kv.put).not.toHaveBeenCalled()
  })

  it('opens the preflight to POST with JSON on this route only', async () => {
    const res = await call(VOTE, { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    const other = await call('https://w.test/v1/style-votes', { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    expect(other.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(other.headers.get('Access-Control-Allow-Headers')).toBeNull()
  })

  it('stops at the day’s cap, counted over every voter’s writes', async () => {
    seed(1, { style: 'real', day: today(), n: DAILY_WRITES - 1 })
    seed(2, { style: 'real', day: '2026-01-01', n: 500 })
    expect((await post({ id: uuid(3), style: 'real' })).status).toBe(204)
    expect((await post({ id: uuid(4), style: 'real' })).status).toBe(429)
  })

  it('limits one voter’s changes in a day, and starts again the next', async () => {
    seed(1, { style: 'real', day: today(), n: DAILY_CHANGES })
    expect((await post({ id: uuid(1), style: 'drawn' })).status).toBe(429)
    seed(2, { style: 'real', day: '2026-01-01', n: DAILY_CHANGES })
    expect((await post({ id: uuid(2), style: 'drawn' })).status).toBe(204)
    expect(kv.data.get(`vote:${uuid(2)}`)?.metadata?.n).toBe(1)
  })

  it('answers 503 when KV is missing or refuses', async () => {
    kv.put.mockRejectedValueOnce(new Error('429'))
    expect((await post({ id: uuid(1), style: 'real' })).status).toBe(503)
    expect((await handle(new Request('https://w.test/v1/style-votes'), {}, ctx, cache)).status).toBe(503)
  })
})

describe('GET /v1/style-votes', () => {
  it('adds up every page of the listing, skipping keys without a vote', async () => {
    kv = voteKv(2)
    for (let i = 1; i <= 5; i++) seed(i, { style: i % 2 ? 'real' : 'drawn', day: today(), n: 1 })
    kv.data.set('vote:junk', { value: 'x' })
    kv.data.set('live', { value: '{}' })
    expect(await totals()).toEqual({ real: 3, drawn: 2 })
    expect(kv.list).toHaveBeenCalledTimes(3)
  })

  it('is kept for a minute and sees this isolate’s new votes at once', async () => {
    expect(await totals()).toEqual({ real: 0, drawn: 0 })
    await post({ id: uuid(1), style: 'drawn' })
    expect(await totals()).toEqual({ real: 0, drawn: 1 })
    expect(kv.list).toHaveBeenCalledTimes(1)
    const res = await call('https://w.test/v1/style-votes', { headers: { Origin: ORIGIN } })
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
  })
})
