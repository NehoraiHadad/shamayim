import { isSceneStyle, type SceneStyle } from '../scene/sceneStyle'
import { storage, type Store } from './placeStorage'

/** Temporary: the scene style a person chose to see, the styles they have seen, and the one they prefer. */
export interface StyleVote {
  /** The style shown. */
  readonly style: SceneStyle
  readonly seen: readonly SceneStyle[]
  /** The style they voted for, and whether the Worker has it. */
  readonly vote: SceneStyle | null
  readonly sent: boolean
  /** A random id, made with the first vote (null where the page is not secure): a later vote replaces the earlier one. */
  readonly id: string | null
}

export type SendVote = (vote: { id: string; style: SceneStyle }) => Promise<boolean>

export interface StyleVoteStore {
  get(): StyleVote
  subscribe(listener: () => void): () => void
  /** Shows a style, from now on. */
  choose(style: SceneStyle): void
  /** Votes for the style shown. */
  vote(): void
  /** Sends a vote the Worker does not have yet. */
  flush(): Promise<void>
}

const KEY = 'shamayim:style-vote:v1'
const FIRST: StyleVote = { style: 'real', seen: ['real'], vote: null, sent: false, id: null }

export const seenBoth = (state: StyleVote) => state.seen.length > 1

export function readStyleVote(store: Store | null = storage()): StyleVote {
  try {
    const raw: unknown = JSON.parse(store?.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return FIRST
    const saved = raw as { [K in keyof StyleVote]?: unknown }
    const style = isSceneStyle(saved.style) ? saved.style : FIRST.style
    const seen = Array.isArray(saved.seen) ? saved.seen.filter(isSceneStyle) : []
    const vote = isSceneStyle(saved.vote) ? saved.vote : null
    return { style, seen: [...new Set([...seen, style])], vote, sent: vote !== null && saved.sent === true,
      id: typeof saved.id === 'string' ? saved.id : null }
  } catch {
    return FIRST
  }
}

/** One store for the app's lifetime; `send` answers whether the Worker took the vote. */
export function createStyleVote(send: SendVote, store: Store | null = storage(),
  newId: () => string | null = () => globalThis.crypto?.randomUUID?.() ?? null): StyleVoteStore {
  let state = readStyleVote(store)
  let sending = false
  const listeners = new Set<() => void>()

  const set = (patch: Partial<StyleVote>) => {
    state = { ...state, ...patch }
    try {
      store?.setItem(KEY, JSON.stringify(state))
    } catch {
      // Storage can be blocked or full; the choice still holds for this session.
    }
    for (const listener of listeners) listener()
  }

  const flush = async (): Promise<void> => {
    const { id, vote, sent } = state
    if (sending || !id || !vote || sent) return
    sending = true
    const taken = await send({ id, style: vote }).catch(() => false)
    sending = false
    if (state.vote !== vote) return flush() // Changed while it was on its way: the newer vote follows.
    if (taken) set({ sent: true })
  }

  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    choose(style) {
      if (style !== state.style) set({ style, seen: [...new Set([...state.seen, style])] })
    },
    vote() {
      if (!seenBoth(state) || state.vote === state.style) return
      set({ vote: state.style, sent: false, id: state.id ?? newId() })
      void flush()
    },
    flush,
  }
}
