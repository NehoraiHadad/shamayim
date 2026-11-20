import { useEffect, useState, type RefObject } from 'react'

/** Where the sky surface goes and how the land's figure stands in it (CSS px). */
export interface SkyHost { element: HTMLElement; width: number; height: number; landTop: number; landLeft: number }

const same = (a: SkyHost | null, b: SkyHost | null) => Boolean(a && b && a.element === b.element && a.width === b.width
  && a.height === b.height && a.landTop === b.landTop && a.landLeft === b.landLeft)

/**
 * The app's sky (`[data-sky]` in `ui/Sky.tsx`) and the figure's place in it (§1e: `box.landTop` measured, not read from
 * the scene's DOM by the sky). The sky scrolls with the page, so the offset holds while scrolling; it is measured again
 * when the sky, the figure or the page change size (a longer sentence above the scene moves the figure down).
 */
export function useSkyHost(figure: RefObject<HTMLElement | null>): SkyHost | null {
  const [host, setHost] = useState<SkyHost | null>(null)
  useEffect(() => {
    const element = document.querySelector<HTMLElement>('[data-sky]')
    const node = figure.current
    if (!element || !node) return
    const measure = () => {
      const sky = element.getBoundingClientRect(), box = node.getBoundingClientRect()
      const next = { element, width: Math.round(sky.width), height: Math.round(sky.height), landTop: Math.round(box.top - sky.top),
        landLeft: Math.round(box.left - sky.left) }
      setHost((prev) => (same(prev, next) ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const target of [element, node, document.documentElement]) observer.observe(target)
    return () => observer.disconnect()
  }, [figure])
  return host
}
