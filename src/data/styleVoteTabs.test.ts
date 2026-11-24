import { describe, expect, it, vi } from 'vitest'
import type { SendVote } from './styleVote'
import { DRAWN, ID, memoryStore, open, settle, slowSend, VOTE_KEY } from './styleVoteFixture'
import { readStyleVote } from './styleVoteSaved'

describe('two tabs of one device', () => {
  it('agree on style and vote, and keep one id', async () => {
    const store = memoryStore()
    const send = vi.fn<SendVote>(async () => 'taken')
    const a = open(async () => 'taken', store)
    const b = open(send, store, 'another id')
    a.choose(DRAWN)
    a.vote()
    await settle()
    b.follow('shamayim:place:v1')
    expect(b.get().vote).toBeNull()
    b.follow(VOTE_KEY)
    expect(b.get()).toMatchObject({ style: DRAWN, vote: DRAWN, sent: true, id: ID })
    b.choose('real')
    b.vote()
    await settle()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'real' })
  })

  it('take the id another tab made even before hearing of it', () => {
    const store = memoryStore()
    const send = vi.fn<SendVote>(async () => 'taken')
    const a = open(async () => 'taken', store)
    const b = open(send, store, 'another id')
    b.choose(DRAWN)
    a.choose(DRAWN)
    a.vote()
    b.vote()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: DRAWN })
  })

  it('follow while sending: the newer vote of the other tab goes next', async () => {
    const { answers, send } = slowSend()
    const store = memoryStore()
    const votes = open(send, store)
    votes.choose(DRAWN)
    votes.vote()
    store.setItem(VOTE_KEY, JSON.stringify({ seen: ['real', DRAWN], vote: 'real', sent: false, id: ID }))
    votes.follow(null)
    answers[0]('taken')
    await settle()
    expect(votes.get().sent).toBe(false)
    answers[1]('taken')
    await settle()
    expect(votes.get()).toMatchObject({ vote: 'real', sent: true, id: ID })
  })

  it('a tab that missed the other one\'s vote keeps it when it catches up first', () => {
    const store = memoryStore()
    const frozen = open(async () => 'taken', store, 'another id')
    const other = open(async () => 'taken', store)
    other.choose(DRAWN)
    other.vote()
    frozen.follow(null)
    frozen.choose('real')
    expect(readStyleVote(store)).toMatchObject({ style: 'real', vote: DRAWN, id: ID })
  })

  it('a tab that could not save keeps its own choice', () => {
    const full = { ...memoryStore(), setItem: () => { throw new Error('full') } }
    for (const store of [full, null]) {
      const votes = open(async () => 'taken', store)
      votes.choose(DRAWN)
      votes.follow(null)
      expect(votes.get()).toMatchObject({ style: DRAWN, seen: ['real', DRAWN] })
    }
  })
})
