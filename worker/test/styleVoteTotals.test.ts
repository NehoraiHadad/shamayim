import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VOTE_ROUND } from '../../src/data/styleVoteRound'
import { clearVoteMemory } from '../src/styleVote'
import { ORIGIN, today, TOTALS, uuid, voteKey, voteWorker } from './voteKv'

beforeEach(clearVoteMemory)
afterEach(() => { vi.useRealTimers() })

describe('GET /v1/style-votes', () => {
  it('adds up every page of the listing, skipping keys without a vote', async () => {
    const { kv, seed, totals } = voteWorker({ pageSize: 2 })
    for (let i = 1; i <= 5; i++) seed(i, { style: i % 2 ? 'real' : 'drawn', day: today(), n: 1 })
    kv.data.set(`vote:${VOTE_ROUND}:junk`, { value: 'x' })
    kv.data.set('live', { value: '{}' })
    expect(await totals()).toEqual({ round: VOTE_ROUND, real: 3, drawn: 2 })
    expect(kv.list).toHaveBeenCalledTimes(3)
  })

  it('counts this round alone', async () => {
    const { kv, seed, totals } = voteWorker()
    const metadata = { style: 'drawn' as const, day: today(), n: 1 }
    for (const key of [`vote:${uuid(1)}`, voteKey(1, 'v1'), voteKey(1, `${VOTE_ROUND}0`)]) kv.data.set(key, { value: 'drawn', metadata })
    seed(2, { style: 'real', day: today(), n: 1 })
    expect(await totals()).toEqual({ round: VOTE_ROUND, real: 1, drawn: 0 })
  })

  it('is kept for five minutes and sees the new votes of this isolate at once', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-23T10:00:00Z') })
    const { kv, vote, totals, call } = voteWorker()
    expect(await totals()).toEqual({ round: VOTE_ROUND, real: 0, drawn: 0 })
    await vote(1, 'drawn')
    vi.advanceTimersByTime(4 * 60_000)
    expect(await totals()).toEqual({ round: VOTE_ROUND, real: 0, drawn: 1 })
    expect(kv.list).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_000)
    const res = await call(TOTALS, { headers: { Origin: ORIGIN } })
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60')
    expect(kv.list).toHaveBeenCalledTimes(2)
  })
})
