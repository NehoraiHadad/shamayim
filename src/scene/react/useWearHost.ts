import { useEffect, useState } from 'react'

export interface WearHost { element: HTMLElement; width: number }

/**
 * The wear card's reserved box (`[data-wear-line]` in `ui/WearCard.tsx`) and its width (CSS px), while the card shows a
 * line (`active`), as `useSkyHost` finds the sky: measured again when the box changes size.
 */
export function useWearHost(active: boolean): WearHost | null {
  const [host, setHost] = useState<WearHost | null>(null)
  useEffect(() => {
    const element = active ? document.querySelector<HTMLElement>('[data-wear-line]') : null
    if (!element) return
    const measure = () => {
      const width = Math.round(element.getBoundingClientRect().width * 100) / 100
      setHost((prev) => (prev?.element === element && prev.width === width ? prev : { element, width }))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [active])
  return active && host?.element.isConnected ? host : null
}
