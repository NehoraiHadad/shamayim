import { useRef, type PointerEvent } from 'react'

/** A downward touch swipe that starts on the element (not on a button) closes the page. */
export function useSwipeClose(onClose: () => void, distance = 56) {
  const drag = useRef<{ pointer: number; x: number; y: number }>(null)
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== 'touch' || (event.target as HTMLElement).closest('button')) return
      drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerCancel() { drag.current = null },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const start = drag.current
      drag.current = null
      if (start?.pointer !== event.pointerId) return
      const dy = event.clientY - start.y
      if (dy > distance && dy > Math.abs(event.clientX - start.x)) onClose()
    },
  }
}
