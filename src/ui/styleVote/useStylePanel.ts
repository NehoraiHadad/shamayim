import { useEffect, type RefObject } from 'react'

const GAP = 8

/** Scroll just enough to show the valley above the comparison panel. */
function revealScene(panel: HTMLElement) {
  const figure = document.querySelector('figure[data-canvas]')
  if (!figure) return
  const inset = parseFloat(getComputedStyle(panel).bottom)
  const limit = window.innerHeight - panel.offsetHeight - inset - GAP
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
