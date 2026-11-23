import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createStyleVote, isPending, seenBoth } from '../../data/styleVote'
import { sendStyleVote } from '../../data/styleVoteSend'

const store = createStyleVote(sendStyleVote)

/** A vote made offline goes out at the next app open, return to it or connection; a device's tabs agree. */
function keepInTouch(): () => void {
  const onVisible = () => { if (!document.hidden) void store.flush() }
  const onStorage = (event: StorageEvent) => store.follow(event.key)
  onVisible()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onVisible)
  window.addEventListener('storage', onStorage)
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onVisible)
    window.removeEventListener('storage', onStorage)
  }
}

/** Temporary: the style switch and vote, shared by the toggle, the panel and the scene. */
export function useStyleVote() {
  const state = useSyncExternalStore(store.subscribe, store.get)
  const [open, setOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)

  useEffect(keepInTouch, [])

  const close = useCallback(() => {
    setOpen(false)
    toggle.current?.focus({ preventScroll: true })
  }, [])

  return { ...state, seenBoth: seenBoth(state), pending: isPending(state), choose: store.choose, castVote: store.vote,
    open, setOpen, close, toggle }
}

export type StyleVoteState = ReturnType<typeof useStyleVote>
