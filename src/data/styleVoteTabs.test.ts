import { describe, expect, it, vi } from 'vitest'
import type { SendVote } from './styleVote'
import { ID, memoryStore, open, settle, slowSend, VOTE_KEY } from './styleVoteFixture'

describe('two tabs of one device', () => {
  it('agree on style and vote, and keep one id', async () => {
    const store = memoryStore()
    const send = vi.fn<SendVote>(async () => true)
    const a = open(async () => true, store)
    const b = open(send, store, 'another id')
    a.choose('drawn')
    a.vote()
    await settle()
    b.follow('shamayim:place:v1')
    expect(b.get().vote).toBeNull()
    b.follow(VOTE_KEY)
    expect(b.get()).toMatchObject({ style: 'drawn', vote: 'drawn', sent: true, id: ID })
    b.choose('real')
    b.vote()
    await settle()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'real' })
  })

  it('take the id another tab made even before hearing of it', () => {
    const store = memoryStore()
    const send = vi.fn<SendVote>(async () => true)
    const a = open(async () => true, store)
    const b = open(send, store, 'another id')
    b.choose('drawn')
    a.choose('drawn')
    a.vote()
    b.vote()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'drawn' })
  })

  it('follow while sending: the newer vote of the other tab goes next', async () => {
    const { answers, send } = slowSend()
    const store = memoryStore()
    const votes = open(send, store)
    votes.choose('drawn')
    votes.vote()
    store.setItem(VOTE_KEY, JSON.stringify({ seen: ['real', 'drawn'], vote: 'real', sent: false, id: ID }))
    votes.follow(null)
    answers[0](true)
    await settle()
    expect(votes.get().sent).toBe(false)
    answers[1](true)
    await settle()
    expect(votes.get()).toMatchObject({ vote: 'real', sent: true, id: ID })
  })
})
