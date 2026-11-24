import type { Store } from './placeStorage'
import { isVoteStyle, VOTE_ROUND, type VoteStyle } from './styleVoteRound'

/** What the device keeps of the style switch and the round's vote. */
export interface SavedVote {
  /** The style shown; it outlives the round. */
  readonly style: VoteStyle
  readonly seen: readonly VoteStyle[]
  /** The style they voted for, and whether the Worker has it. */
  readonly vote: VoteStyle | null
  readonly sent: boolean
  /** A random id, made with the round's first vote (null where the page is not secure): a later vote replaces the earlier one. */
  readonly id: string | null
}

const STYLE_KEY = 'shamayim:scene-style:v1'
/** A key a round, so a tab still running an older app cannot write over a newer round's vote. */
const VOTE_KEY = `shamayim:style-vote:${VOTE_ROUND}`

export const isVoteKey = (key: string) => key === STYLE_KEY || key === VOTE_KEY

type Fields = { [K in keyof SavedVote]?: unknown }

function readRound(store: Store | null): Fields {
  const raw: unknown = JSON.parse(store?.getItem(VOTE_KEY) ?? 'null')
  return raw && typeof raw === 'object' ? raw : {}
}

export function readStyleVote(store: Store | null): SavedVote {
  let style: VoteStyle = 'real'
  let round: Fields = {}
  try {
    const shown = store?.getItem(STYLE_KEY)
    if (isVoteStyle(shown)) style = shown
    round = readRound(store)
  } catch {
    // Blocked or broken storage: as on a first visit.
  }
  const seen = Array.isArray(round.seen) ? round.seen.filter(isVoteStyle) : []
  const vote = isVoteStyle(round.vote) ? round.vote : null
  return { style, seen: [...new Set([...seen, style])], vote, sent: vote !== null && round.sent === true,
    id: typeof round.id === 'string' ? round.id : null }
}

/** False when storage is blocked or full: the choice then holds for this session alone. */
export function saveStyleVote({ style, seen, vote, sent, id }: SavedVote, store: Store | null): boolean {
  if (!store) return false
  try {
    store.setItem(STYLE_KEY, style)
    store.setItem(VOTE_KEY, JSON.stringify({ seen, vote, sent, id }))
    return true
  } catch {
    return false
  }
}
