import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createStyleVote, seenBoth } from '../../data/styleVote'
import { sendStyleVote } from '../../data/styleVoteSend'

const store = createStyleVote(sendStyleVote)

/** Temporary: the style switch and vote, shared by the toggle, the panel and the scene. */
export function useStyleVote() {
  const state = useSyncExternalStore(store.subscribe, store.get)
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  // A vote made offline goes out at the next app open.
  useEffect(() => { void store.flush() }, [])

  const close = useCallback(() => {
    setOpen(false)
    toggle.current?.focus({ preventScroll: true })
  }, [])

  return { ...state, seenBoth: seenBoth(state), choose: store.choose, castVote: store.vote, open, setOpen, close, toggle }
}

export type StyleVoteState = ReturnType<typeof useStyleVote>
