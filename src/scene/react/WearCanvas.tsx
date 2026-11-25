import { useCallback, useEffect, useMemo } from 'react'
import type { Surface } from '../compose/surface'
import { PAD, wearLayers, wearSurface, type WearPaper } from '../model/wear'
import type { WorldState } from '../../world/types'
import { useSurface } from './useSurface'

/** What the wear card hangs on its line (the tip's garments, in the sentence's order) and the paper it is printed on. */
export interface WearLine { garments: readonly string[]; paper: WearPaper }

interface Props extends WearLine {
  world: WorldState
  /** The line box's width (CSS px): the card's reserved box, measured. */
  width: number
  onReady?: () => void
  /** Receives the compositor (the harness lays frames through it). */
  surfaceRef?: { current: Surface | null }
}

/**
 * The wear card's clothesline on canvas (`model/wear.ts`), drawn from the scene's own world at the shown hour: a surface
 * of its own over the card's reserved box, standing out from it by `PAD` on every side (the cloth hangs below the box,
 * as the SVG's overflow did), so the card's layout never moves. Decorative: hidden from the reader, the card's sentence
 * carries the words. Its sprites are painted in a paint worker of its own, as the scene's are (the main thread's cold
 * cost of painting them itself was ~90 ms at CPU ×4); the gusts are laid by the compositor, nothing repainted.
 */
export function WearCanvas({ world, garments, paper, width, onReady, surfaceRef }: Props) {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  // The garments by their names: a new array of the same garments is the same line.
  const names = garments.join(',')
  const layers = useMemo(() => wearLayers(world, names.split(','), paper, { width, dpr }), [world, names, paper, width, dpr])
  const size = wearSurface(width)
  const markPainted = useCallback((canvas: HTMLCanvasElement) => {
    canvas.dataset.wearPainted = ''
    onReady?.()
  }, [onReady])
  const { ref, surface } = useSurface('wear', layers, { width: size.width, height: size.height, dpr }, markPainted)
  useEffect(() => { if (surfaceRef) surfaceRef.current = surface.current })
  return <canvas ref={ref} aria-hidden="true" data-wear-canvas
    style={{ position: 'absolute', left: -PAD.x, top: -PAD.top, width: size.width, height: size.height, display: 'block', pointerEvents: 'none' }} />
}

