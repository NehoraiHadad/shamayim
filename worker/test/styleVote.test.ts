import { beforeEach, describe, expect, it } from 'vitest'
import { VOTE_ROUND } from '../../src/data/styleVoteRound'
import { clearVoteMemory } from '../src/styleVote'
import { ORIGIN, today, TOTALS, uuid, VOTE, voteKey, voteWorker } from './voteKv'

let worker: ReturnType<typeof voteWorker>

beforeEach(() => {
  clearVoteMemory()
  worker = voteWorker()
})

describe('POST /v1/style-vote', () => {
  it('keeps the vote in metadata for a year, and nothing about the voter', async () => {
    const res = await worker.vote(1, 'drawn', { 'CF-Connecting-IP': '203.0.113.9', 'User-Agent': 'phone' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect([...worker.kv.data]).toEqual([[voteKey(1), { value: 'drawn', expirationTtl: 365 * 24 * 3600,
      metadata: { style: 'drawn', day: today(), n: 1 } }]])
  })

  it('replaces the vote of the same id, also back within the read delay of KV', async () => {
    for (const style of ['real', 'drawn', 'real']) await worker.vote(1, style)
    expect(worker.kv.data.size).toBe(1)
    expect(worker.kv.data.get(voteKey(1))?.metadata).toMatchObject({ style: 'real', n: 3 })
    expect(await worker.totals()).toMatchObject({ round: VOTE_ROUND, real: 1, drawn: 0 })
  })

  it('counts a voter once while KV does not answer their vote yet', async () => {
    worker.kv.getWithMetadata.mockResolvedValue({ value: null, metadata: null })
    for (const style of ['real', 'drawn']) await worker.vote(1, style)
    expect(worker.kv.data.get(voteKey(1))?.metadata?.n).toBe(2)
    expect(await worker.totals()).toMatchObject({ real: 0, drawn: 1, today: 2 })
  })

  it('writes a change back although KV still answers the older, same style (another isolate took the change)', async () => {
    await worker.vote(1, 'drawn')
    clearVoteMemory()
    worker.kv.getWithMetadata.mockResolvedValueOnce({ value: 'real', metadata: { style: 'real', day: today(), n: 1 } })
    expect((await worker.vote(1, 'real')).status).toBe(204)
    expect(worker.kv.data.get(voteKey(1))?.metadata?.style).toBe('real')
  })

  it('refuses a vote of another round', async () => {
    expect((await worker.post({ id: uuid(1), style: 'real', round: 'v1' })).status).toBe(409)
    expect(worker.kv.put).not.toHaveBeenCalled()
  })

  it('refuses bad bodies without touching KV', async () => {
    const round = VOTE_ROUND
    const bad = ['', 'x', '[]', 'null', { id: uuid(1) }, { id: uuid(1), style: 'real' }, { id: uuid(1), style: 'real', round: 2 },
      { id: 'me', style: 'real', round }, { id: uuid(1), style: 'other', round }, { id: uuid(1), style: 'real', round, name: 'x' }]
    for (const body of bad) expect((await worker.post(body)).status, JSON.stringify(body)).toBe(400)
    expect((await worker.post({ id: uuid(1), style: 'real', round, pad: 'x'.repeat(300) })).status).toBe(413)
    expect((await worker.vote(1, 'real', { 'Content-Type': 'text/plain' })).status).toBe(415)
    expect(worker.kv.getWithMetadata).not.toHaveBeenCalled()
    expect(worker.kv.put).not.toHaveBeenCalled()
  })

  it('needs an allowed Origin, and POST', async () => {
    const body = JSON.stringify({ id: uuid(1), style: 'real', round: VOTE_ROUND })
    const headers = { 'Content-Type': 'application/json' }
    expect((await worker.call(VOTE, { method: 'POST', headers, body })).status).toBe(403)
    expect((await worker.call(VOTE, { method: 'POST', headers: { ...headers, Origin: 'https://evil.test' }, body })).status).toBe(403)
    const get = await worker.call(VOTE, { headers: { Origin: ORIGIN } })
    expect(get.status).toBe(405)
    expect(get.headers.get('Allow')).toBe('POST, OPTIONS')
    expect(worker.kv.put).not.toHaveBeenCalled()
  })

  it('opens the preflight to POST with JSON on this route only', async () => {
    const res = await worker.call(VOTE, { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    const other = await worker.call(TOTALS, { method: 'OPTIONS', headers: { Origin: ORIGIN } })
    expect(other.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS')
    expect(other.headers.get('Access-Control-Allow-Headers')).toBeNull()
  })

  it('answers 503 when KV is missing or refuses', async () => {
    worker.kv.put.mockRejectedValueOnce(new Error('429'))
    expect((await worker.vote(1, 'real')).status).toBe(503)
    expect((await worker.vote(1, 'real')).status).toBe(204)
    const without = voteWorker({ env: { LIVE: undefined } })
    expect((await without.vote(1, 'real')).status).toBe(503)
    expect((await without.call(TOTALS)).status).toBe(503)
  })
})
