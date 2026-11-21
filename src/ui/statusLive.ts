import type { Freshness } from '../data/cache'
import type { FailureCause } from '../data/fetchFailure'
import { problemAnnouncement, type UpdateProblem } from '../text/status'

export interface LiveState {
  problem: UpdateProblem
  notice: string
  delivered: boolean
  /** Current text for the `role="status"` live region; starts empty so it mounts empty. */
  live: string
}

export const LIVE_INITIAL: LiveState = { problem: null, notice: '', delivered: false, live: '' }

export type LiveAction =
  | { type: 'sync'; problem: UpdateProblem; fetchedAt: number | null; update: string }
  | { type: 'clear' }

/** Combine browser connectivity with fetch/cache state so losing the network with a fresh cache still surfaces offline. */
export function deriveProblem(online: boolean, failure: FailureCause | null, freshness: Freshness | null): UpdateProblem {
  if (!online) return 'offline'
  if (failure && failure !== 'network') return 'service'
  if (failure || freshness === 'stale') return 'offline'
  return null
}

/** Queue a problem notice behind an active refresh so "מעדכן…" never swallows it, and avoid re-reading once delivered. */
export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  if (action.type === 'clear') {
    return state.notice || state.delivered || state.live
      ? { ...state, notice: '', delivered: false, live: '' }
      : state
  }
  const busy = Boolean(action.update)
  let notice = state.notice
  let delivered = state.delivered
  if (state.problem !== action.problem) {
    notice = problemAnnouncement(state.problem, action.problem, action.fetchedAt) ?? ''
    delivered = Boolean(notice) && !busy
  } else if (!busy && notice && !delivered) {
    delivered = true
  } else if (busy && delivered) {
    notice = ''
    delivered = false
  }
  const live = action.update || notice
  if (state.problem === action.problem && state.notice === notice && state.delivered === delivered && state.live === live) {
    return state
  }
  return { problem: action.problem, notice, delivered, live }
}
