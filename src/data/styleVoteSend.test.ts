import { afterEach, describe, expect, it, vi } from 'vitest'
import { VOTE_ROUND } from './styleVoteRound'
import { sendStyleVote } from './styleVoteSend'
import { styleVoteUrl } from './weatherApi'

const VOTE = { id: '00000000-0000-4000-8000-000000000001', style: 'real' } as const

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
    expect(await sendStyleVote(VOTE)).toBe('refused')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('posts only the id, the style and the round, and tells taken from refused and failed', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 })).mockRejectedValueOnce(new TypeError('offline'))
    vi.stubGlobal('fetch', fetch)
    vi.stubEnv('VITE_WEATHER_API_BASE', 'https://w.test/')
    const results = []
    for (let i = 0; i < 4; i++) results.push(await sendStyleVote(VOTE))
    expect(results).toEqual(['taken', 'refused', 'failed', 'failed'])
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe('https://w.test/v1/style-vote')
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ ...VOTE, round: VOTE_ROUND }) })
  })
})
