import { useEffect, useRef, useState } from 'react'

/** A ref for an element and its rendered width in px (the scene draws to it), kept current on resize. */
export function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
