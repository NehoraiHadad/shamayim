import { useEffect, type RefObject } from 'react'

/** Air between the valley and the panel, and the panel's height off the bottom while an hour is picked (`[data-picked]`). */
const GAP = 8
const LIFTED = 62

/** Scrolls just enough that the whole valley stands above the panel, also when an hour lifts it, with as much sky as fits. */
function revealScene(panel: HTMLElement) {
  const figure = document.querySelector('figure[data-canvas]')
  if (!figure) return
  const limit = window.innerHeight - panel.offsetHeight - LIFTED - GAP
  const top = Math.max(0, window.scrollY + figure.getBoundingClientRect().bottom - limit)
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

/** On opening: the valley in view and focus on the chosen style. While open: Escape closes. */
export function useStylePanel(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const element = panel.current
    if (!element) return
    element.querySelector<HTMLInputElement>('input:checked')?.focus({ preventScroll: true })
    revealScene(element)
  }, [panel])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // Escape belongs to an open dialog, or to the hour slider (back to now), before the panel.
      if (document.querySelector('dialog[open]')) return
      if (event.target instanceof Element && event.target.closest('[role="slider"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
}
