import type { SceneStyle } from '../scene/sceneStyle'
import { storage, type Store } from './placeStorage'
import { isVoteKey, readStyleVote, saveStyleVote, type SavedVote } from './styleVoteSaved'

/** Temporary: the scene style a person chose to see, the styles they have seen, and the one they prefer. */
export interface StyleVote extends SavedVote {
  /** The vote is on its way to the Worker. */
  readonly sending: boolean
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
  /** Another tab wrote to storage (null: cleared it all); this tab follows. */
  follow(key: string | null): void
}

export const seenBoth = (state: SavedVote) => state.seen.length > 1

/** Voted, and the Worker does not have it: refused, or no connection. */
export const isPending = (state: StyleVote) => state.vote !== null && !state.sent && !state.sending

/** One store for the app's lifetime; `send` answers whether the Worker took the vote. */
export function createStyleVote(send: SendVote, store: Store | null = storage(),
  newId: () => string | null = () => globalThis.crypto?.randomUUID?.() ?? null): StyleVoteStore {
  let state: StyleVote = { ...readStyleVote(store), sending: false }
  const listeners = new Set<() => void>()

  const show = (patch: Partial<StyleVote>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }
  const set = (patch: Partial<SavedVote>) => {
    const { sending: _, ...saved } = { ...state, ...patch }
    saveStyleVote(saved, store)
    show(saved)
  }

  const flush = async (): Promise<void> => {
    const { id, vote, sent, sending } = state
    if (sending || !id || !vote || sent) return
    show({ sending: true })
    const taken = await send({ id, style: vote }).catch(() => false)
    const changed = state.id !== id || state.vote !== vote
    if (taken && !changed) set({ sent: true })
    show({ sending: false })
    if (changed) return flush() // Changed while it was on its way: the newer vote follows.
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
      set({ vote: state.style, sent: false, id: state.id ?? readStyleVote(store).id ?? newId() })
      void flush()
    },
    flush,
    follow(key) {
      if (key === null || isVoteKey(key)) show(readStyleVote(store))
    },
  }
}
