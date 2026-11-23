import { isSceneStyle, type SceneStyle } from '../scene/sceneStyle'
import type { Store } from './placeStorage'
import { VOTE_ROUND } from './styleVoteRound'

/** What the device keeps of the style switch and the round's vote. */
export interface SavedVote {
  /** The style shown; it outlives the round. */
  readonly style: SceneStyle
  readonly seen: readonly SceneStyle[]
  /** The style they voted for, and whether the Worker has it. */
  readonly vote: SceneStyle | null
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
  let style: SceneStyle = 'real'
  let round: Fields = {}
  try {
    const shown = store?.getItem(STYLE_KEY)
    if (isSceneStyle(shown)) style = shown
    round = readRound(store)
  } catch {
    // Blocked or broken storage: as on a first visit.
  }
  const seen = Array.isArray(round.seen) ? round.seen.filter(isSceneStyle) : []
  const vote = isSceneStyle(round.vote) ? round.vote : null
  return { style, seen: [...new Set([...seen, style])], vote, sent: vote !== null && round.sent === true,
    id: typeof round.id === 'string' ? round.id : null }
}

export function saveStyleVote({ style, ...round }: SavedVote, store: Store | null): void {
  try {
    store?.setItem(STYLE_KEY, style)
    store?.setItem(VOTE_KEY, JSON.stringify(round))
  } catch {
    // Storage can be blocked or full; the choice still holds for this session.
  }
}
