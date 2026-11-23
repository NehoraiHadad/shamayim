import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearVoteMemory, DAILY_PER_VOTER, DAILY_WRITES } from '../src/styleVote'
import { ORIGIN, today, TOTALS, voteKey, voteWorker } from './voteKv'

const EARLIER = '2026-01-01'

beforeEach(clearVoteMemory)

describe('daily caps', () => {
  it('stop the day at its cap, counted over the writes of every voter', async () => {
    const { seed, vote } = voteWorker()
    seed(1, { style: 'real', day: today(), n: DAILY_WRITES - 1 })
    seed(2, { style: 'real', day: EARLIER, n: 500 })
    expect((await vote(3, 'real')).status).toBe(204)
    expect((await vote(4, 'real')).status).toBe(429)
  })

  it('limit the writes of one voter in a day, and start again the next', async () => {
    const { seed, vote, kv } = voteWorker()
    seed(1, { style: 'real', day: today(), n: DAILY_PER_VOTER })
    expect((await vote(1, 'drawn')).status).toBe(429)
    seed(2, { style: 'real', day: EARLIER, n: DAILY_PER_VOTER })
    expect((await vote(2, 'drawn')).status).toBe(204)
    expect(kv.data.get(voteKey(2))?.metadata?.n).toBe(1)
  })
})

describe('requests from one address', () => {
  const limiter = (answer: () => Promise<{ success: boolean }>) => ({ limit: vi.fn(answer) })
  const from = { 'CF-Connecting-IP': '203.0.113.9' }

  it('are refused over the limit on both routes, before KV, in a way the app can read', async () => {
    const VOTE_LIMIT = limiter(async () => ({ success: false }))
    const worker = voteWorker({ env: { VOTE_LIMIT } })
    const res = await worker.vote(1, 'real', from)
    expect(res.status).toBe(429)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect((await worker.call(TOTALS, { headers: from })).status).toBe(429)
    expect(VOTE_LIMIT.limit).toHaveBeenCalledWith({ key: '203.0.113.9' })
    expect(worker.kv.getWithMetadata).not.toHaveBeenCalled()
    expect(worker.kv.list).not.toHaveBeenCalled()
  })

  it('pass under it, without an address, and when the limiter fails', async () => {
    const allow = limiter(async () => ({ success: true }))
    expect((await voteWorker({ env: { VOTE_LIMIT: allow } }).vote(1, 'real', from)).status).toBe(204)
    const refuse = limiter(async () => ({ success: false }))
    expect((await voteWorker({ env: { VOTE_LIMIT: refuse } }).vote(2, 'real')).status).toBe(204)
    expect(refuse.limit).not.toHaveBeenCalled()
    const broken = limiter(async () => { throw new Error('down') })
    expect((await voteWorker({ env: { VOTE_LIMIT: broken } }).vote(3, 'real', from)).status).toBe(204)
  })

  it('are not counted on the other routes', async () => {
    const VOTE_LIMIT = limiter(async () => ({ success: false }))
    const res = await voteWorker({ env: { VOTE_LIMIT } }).call('https://w.test/v1/none', { headers: { Origin: ORIGIN, ...from } })
    expect(res.status).toBe(404)
    expect(VOTE_LIMIT.limit).not.toHaveBeenCalled()
  })
})
