import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStyleVote, readStyleVote, seenBoth, type SendVote } from './styleVote'
import { sendStyleVote } from './styleVoteSend'
import { styleVoteUrl } from './weatherApi'

const ID = '00000000-0000-4000-8000-000000000001'

function memoryStore(initial?: unknown) {
  let value = initial === undefined ? null : typeof initial === 'string' ? initial : JSON.stringify(initial)
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next } }
}
const open = (send: SendVote, store: ReturnType<typeof memoryStore> | null = memoryStore()) => createStyleVote(send, store, () => ID)
/** Lets the send's promise chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve))

describe('style shown', () => {
  it('is real until chosen otherwise, and the choice stays', () => {
    const store = memoryStore()
    const votes = open(vi.fn(), store)
    expect(votes.get()).toEqual({ style: 'real', seen: ['real'], vote: null, sent: false, id: null })
    votes.choose('drawn')
    expect(readStyleVote(store)).toMatchObject({ style: 'drawn', seen: ['real', 'drawn'], id: null })
  })

  it('survives broken or foreign storage', () => {
    for (const bad of ['{', 'null', '3', '"x"', { style: 'other', seen: 'x', vote: 1, sent: true }]) {
      expect(readStyleVote(memoryStore(bad))).toEqual({ style: 'real', seen: ['real'], vote: null, sent: false, id: null })
    }
    const votes = open(vi.fn(), null)
    votes.choose('drawn')
    expect(votes.get().style).toBe('drawn')
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
    await settle()
    expect(readStyleVote(store)).toMatchObject({ vote: 'drawn', sent: true, id: ID })
    votes.vote()
    await votes.flush()
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('keeps an unsent vote and sends it at the next open, with the same id', async () => {
    const store = memoryStore()
    const offline = open(vi.fn<SendVote>().mockRejectedValue(new Error('offline')), store)
    offline.choose('drawn')
    offline.vote()
    await settle()
    expect(readStyleVote(store)).toMatchObject({ vote: 'drawn', sent: false })
    const send = vi.fn<SendVote>(async () => true)
    await open(send, store).flush()
    expect(send).toHaveBeenCalledExactlyOnceWith({ id: ID, style: 'drawn' })
    expect(readStyleVote(store).sent).toBe(true)
  })

  it('changed while on its way: the newer vote follows, one at a time', async () => {
    const answers: ((ok: boolean) => void)[] = []
    const send = vi.fn<SendVote>(() => new Promise((resolve) => answers.push(resolve)))
    const votes = open(send)
    votes.choose('drawn')
    votes.vote()
    votes.choose('real')
    votes.vote()
    expect(send).toHaveBeenCalledTimes(1)
    answers[0](false)
    await settle()
    expect(send.mock.calls.map(([v]) => v.style)).toEqual(['drawn', 'real'])
    answers[1](true)
    await settle()
    expect(votes.get()).toMatchObject({ vote: 'real', sent: true })
  })
})

describe('sendStyleVote', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends nothing without a Worker', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('VITE_WEATHER_API_BASE', '')
    expect(styleVoteUrl()).toBeNull()
    expect(await sendStyleVote({ id: ID, style: 'real' })).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts only the id and the style, and answers whether it was taken', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 })).mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test/')
    const results = []
    for (let i = 0; i < 3; i++) results.push(await sendStyleVote({ id: ID, style: 'real' }))
    expect(results).toEqual([true, false, false])
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://w.test/v1/style-vote')
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ id: ID, style: 'real' }) })
  })
})
