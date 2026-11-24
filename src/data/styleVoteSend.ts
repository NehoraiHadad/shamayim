import type { SendVote } from './styleVote'
import { VOTE_ROUND } from './styleVoteRound'
import { styleVoteUrl } from './weatherApi'

/** Sends a vote to the Worker. Never throws. */
export const sendStyleVote: SendVote = async (vote) => {
  const url = styleVoteUrl()
  if (!url) return 'refused'
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vote, round: VOTE_ROUND }), keepalive: true, signal: AbortSignal.timeout(8000) })
    return res.ok ? 'taken' : res.status < 500 ? 'refused' : 'failed'
  } catch {
    return 'failed'
  }
}
