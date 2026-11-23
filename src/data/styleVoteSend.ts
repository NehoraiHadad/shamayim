import type { SendVote } from './styleVote'
import { styleVoteUrl } from './weatherApi'

/** Sends a vote to the Worker; false without one, offline, or when it is refused. Never throws. */
export const sendStyleVote: SendVote = async (vote) => {
  const url = styleVoteUrl()
  if (!url) return false
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vote), keepalive: true, signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}
