import { storage, type Store } from './placeStorage'
import type { VoteStyle } from './styleVoteRound'
import { isVoteKey, readStyleVote, saveStyleVote, type SavedVote } from './styleVoteSaved'

/** Temporary: the scene style a person chose to see, the styles they have seen, and the one they prefer. */
export interface StyleVote extends SavedVote {
  /** The vote is on its way to the Worker. */
  readonly sending: boolean
}

/** `refused`: the Worker does not take it now; `failed`: no answer, or the Worker is unwell. */
export type SendAnswer = 'taken' | 'refused' | 'failed'
export type SendVote = (vote: { id: string; style: VoteStyle }) => Promise<SendAnswer>

export interface StyleVoteStore {
  get(): StyleVote
  subscribe(listener: () => void): () => void
  /** Shows a style, from now on. */
  choose(style: VoteStyle): void
  /** Votes for the style shown. */
  vote(): void
  /** Sends a vote the Worker does not have yet. */
  flush(): Promise<void>
  /** Another tab wrote this key to storage (null: perhaps any); this tab follows. */
  follow(key: string | null): void
}

export const seenBoth = (state: SavedVote) => state.seen.length > 1

/** Voted, and the Worker does not have it: refused, or no connection. */
export const isPending = (state: StyleVote) => state.vote !== null && !state.sent && !state.sending

/** Before a vote is sent again: KV takes one write a second to a key. */
const PAUSE_MS = 2000

const pauseBefore = () => new Promise<void>((resolve) => { setTimeout(resolve, PAUSE_MS) })

/** One store for the app's lifetime. */
export function createStyleVote(send: SendVote, store: Store | null = storage(),
  newId: () => string | null = () => globalThis.crypto?.randomUUID?.() ?? null, pause = pauseBefore): StyleVoteStore {
  let state: StyleVote = { ...readStyleVote(store), sending: false }
  /** Storage holds what this tab holds, so another tab's writes may replace it. */
  let saved = store !== null
  const listeners = new Set<() => void>()

  const show = (patch: Partial<StyleVote>) => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }
  const set = (patch: Partial<SavedVote>) => {
    show(patch)
    saved = saveStyleVote(state, store)
  }

  const flush = async (): Promise<void> => {
    if (state.sending || !state.id || !state.vote || state.sent) return
    show({ sending: true })
    let retries = 1
    for (;;) {
      const { id, vote }: StyleVote = state
      if (!id || !vote) break
      const answer = await send({ id, style: vote }).catch((): SendAnswer => 'failed')
      // Changed while it was on its way: the newer vote follows.
      const changed = state.id !== id || state.vote !== vote
      if (answer === 'taken' && !changed) set({ sent: true })
      if (!changed && (answer !== 'failed' || retries-- === 0)) break
      await pause()
    }
    show({ sending: false })
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
      if (saved && (key === null || isVoteKey(key))) show(readStyleVote(store))
    },
  }
}
