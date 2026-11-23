import { describe, expect, it, vi } from 'vitest'
import { isPending, seenBoth, type SendVote } from './styleVote'
import { ID, memoryStore, open, settle, slowSend, STYLE_KEY, VOTE_KEY } from './styleVoteFixture'
import { readStyleVote } from './styleVoteSaved'

const FIRST = { style: 'real', seen: ['real'], vote: null, sent: false, id: null }

describe('style shown', () => {
  it('is real until chosen otherwise, and the choice stays', () => {
    const store = memoryStore()
    const votes = open(vi.fn(), store)
    expect(votes.get()).toEqual({ ...FIRST, sending: false })
    votes.choose('drawn')
    expect(readStyleVote(store)).toMatchObject({ style: 'drawn', seen: ['real', 'drawn'], id: null })
  })

  it('survives broken or foreign storage', () => {
    for (const bad of ['{', 'null', '3', '"x"', '{"seen":"x","vote":1,"sent":true,"id":4}']) {
      expect(readStyleVote(memoryStore({ [STYLE_KEY]: 'other', [VOTE_KEY]: bad }))).toEqual(FIRST)
    }
    const votes = open(vi.fn(), null)
    votes.choose('drawn')
    expect(votes.get().style).toBe('drawn')
  })

  it('outlives a round; the vote of another round does not', () => {
    const old = JSON.stringify({ seen: ['real', 'drawn'], vote: 'drawn', sent: true, id: ID })
    const store = memoryStore({ [STYLE_KEY]: 'drawn', 'shamayim:style-vote:v1': old })
    expect(readStyleVote(store)).toEqual({ ...FIRST, style: 'drawn', seen: ['drawn'] })
  })

  it('tells its listeners', () => {
    const votes = open(vi.fn())
    const listener = vi.fn()
    const stop = votes.subscribe(listener)
    votes.choose('real')
    expect(listener).not.toHaveBeenCalled()
    votes.choose('drawn')
    stop()
    votes.choose('real')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('vote', () => {
  it('waits until both styles were seen', () => {
    const send = vi.fn<SendVote>(async () => true)
    const votes = open(send)
    expect(seenBoth(votes.get())).toBe(false)
    votes.vote()
    expect(votes.get().vote).toBeNull()
    votes.choose('drawn')
    expect(seenBoth(votes.get())).toBe(true)
    votes.vote()
    expect(votes.get().vote).toBe('drawn')
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'drawn' })
  })

  it('is marked sent when the Worker took it, and the same vote is not sent again', async () => {
    const send = vi.fn<SendVote>(async () => true)
    const store = memoryStore()
    const votes = open(send, store)
    votes.choose('drawn')
    votes.vote()
    expect(votes.get().sending).toBe(true)
    expect(isPending(votes.get())).toBe(false)
    await settle()
    expect(readStyleVote(store)).toMatchObject({ vote: 'drawn', sent: true, id: ID })
    expect(store.data.get(VOTE_KEY)).not.toContain('sending')
    votes.vote()
    await votes.flush()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('is kept unsent, says so, and goes out at the next open with the same id', async () => {
    const store = memoryStore()
    const offline = open(vi.fn<SendVote>().mockRejectedValue(new Error('offline')), store)
    offline.choose('drawn')
    offline.vote()
    await settle()
    expect(isPending(offline.get())).toBe(true)
    expect(readStyleVote(store)).toMatchObject({ vote: 'drawn', sent: false })
    const send = vi.fn<SendVote>(async () => true)
    const next = open(send, store)
    await next.flush()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'drawn' })
    expect(isPending(next.get())).toBe(false)
    expect(readStyleVote(store).sent).toBe(true)
  })

  it('changed while on its way: the newer vote follows, one at a time', async () => {
    const { answers, send } = slowSend()
    const votes = open(send)
    votes.choose('drawn')
    votes.vote()
    votes.choose('real')
    votes.vote()
    await votes.flush()
    expect(send).toHaveBeenCalledTimes(1)
    answers[0](false)
    await settle()
    expect(send.mock.calls.map(([v]) => v.style)).toEqual(['drawn', 'real'])
    answers[1](true)
    await settle()
    expect(votes.get()).toMatchObject({ vote: 'real', sent: true, sending: false })
  })
})
