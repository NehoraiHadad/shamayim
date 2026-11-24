import { describe, expect, it, vi } from 'vitest'
import { isPending, seenBoth, type SendVote } from './styleVote'
import { DRAWN, ID, memoryStore, open, settle, slowSend, STYLE_KEY, VOTE_KEY } from './styleVoteFixture'
import { readStyleVote } from './styleVoteSaved'

const FIRST = { style: 'real', seen: ['real'], vote: null, sent: false, id: null }

describe('style shown', () => {
  it('is real until chosen otherwise, and the choice stays', () => {
    const store = memoryStore()
    const votes = open(vi.fn(), store)
    expect(votes.get()).toEqual({ ...FIRST, sending: false })
    votes.choose(DRAWN)
    expect(readStyleVote(store)).toMatchObject({ style: DRAWN, seen: ['real', DRAWN], id: null })
  })

  it('survives broken or foreign storage', () => {
    for (const bad of ['{', 'null', '3', '"x"', '{"seen":"x","vote":1,"sent":true,"id":4}']) {
      expect(readStyleVote(memoryStore({ [STYLE_KEY]: 'other', [VOTE_KEY]: bad }))).toEqual(FIRST)
    }
    const votes = open(vi.fn(), null)
    votes.choose(DRAWN)
    expect(votes.get().style).toBe(DRAWN)
  })

  it('outlives a round; the vote of another round does not', () => {
    const old = JSON.stringify({ seen: ['real', DRAWN], vote: DRAWN, sent: true, id: ID })
    const store = memoryStore({ [STYLE_KEY]: DRAWN, 'shamayim:style-vote:v1': old })
    expect(readStyleVote(store)).toEqual({ ...FIRST, style: DRAWN, seen: [DRAWN] })
  })

  it('tells its listeners', () => {
    const votes = open(vi.fn())
    const listener = vi.fn()
    const stop = votes.subscribe(listener)
    votes.choose('real')
    expect(listener).not.toHaveBeenCalled()
    votes.choose(DRAWN)
    stop()
    votes.choose('real')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('vote', () => {
  it('waits until both styles were seen', () => {
    const send = vi.fn<SendVote>(async () => 'taken')
    const votes = open(send)
    expect(seenBoth(votes.get())).toBe(false)
    votes.vote()
    expect(votes.get().vote).toBeNull()
    votes.choose(DRAWN)
    expect(seenBoth(votes.get())).toBe(true)
    votes.vote()
    expect(votes.get().vote).toBe(DRAWN)
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: DRAWN })
  })

  it('is marked sent when the Worker took it, and the same vote is not sent again', async () => {
    const send = vi.fn<SendVote>(async () => 'taken')
    const store = memoryStore()
    const votes = open(send, store)
    votes.choose(DRAWN)
    votes.vote()
    expect(votes.get().sending).toBe(true)
    expect(isPending(votes.get())).toBe(false)
    await settle()
    expect(readStyleVote(store)).toMatchObject({ vote: DRAWN, sent: true, id: ID })
    expect(store.data.get(VOTE_KEY)).not.toContain('sending')
    votes.vote()
    await votes.flush()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('is kept unsent, says so, and goes out at the next open with the same id', async () => {
    const store = memoryStore()
    const offline = open(vi.fn<SendVote>().mockRejectedValue(new Error('offline')), store)
    offline.choose(DRAWN)
    offline.vote()
    await settle()
    expect(isPending(offline.get())).toBe(true)
    expect(readStyleVote(store)).toMatchObject({ vote: DRAWN, sent: false })
    const send = vi.fn<SendVote>(async () => 'taken')
    const next = open(send, store)
    await next.flush()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: DRAWN })
    expect(isPending(next.get())).toBe(false)
    expect(readStyleVote(store).sent).toBe(true)
  })

  it('without an answer is sent again after a pause, meanwhile as on its way', async () => {
    const { answers, send } = slowSend()
    const votes = open(send)
    votes.choose(DRAWN)
    votes.vote()
    answers[0]('failed')
    await settle()
    expect(votes.get().sending).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
    answers[1]('failed')
    await settle()
    expect(isPending(votes.get())).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('refused by the Worker waits for the next open, with no second try', async () => {
    const send = vi.fn<SendVote>(async () => 'refused')
    const votes = open(send)
    votes.choose(DRAWN)
    votes.vote()
    await settle()
    expect(isPending(votes.get())).toBe(true)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('changed while on its way: the newer vote follows, one at a time', async () => {
    const { answers, send } = slowSend()
    const votes = open(send)
    votes.choose(DRAWN)
    votes.vote()
    votes.choose('real')
    votes.vote()
    await votes.flush()
    expect(send).toHaveBeenCalledTimes(1)
    answers[0]('failed')
    await settle()
    expect(send.mock.calls.map(([v]) => v.style)).toEqual([DRAWN, 'real'])
    answers[1]('taken')
    await settle()
    expect(votes.get()).toMatchObject({ vote: 'real', sent: true, sending: false })
  })
})
