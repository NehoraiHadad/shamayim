import { useEffect } from 'react'
import type { Forecast, LocalTime } from '../../domain/types'
import type { WorldInput } from '../../world/types'
import { SceneCanvas } from './SceneCanvas'
import { useWorld } from './useWorld'

interface Props {
  input: WorldInput
  forecast: Forecast
  now: LocalTime
  selected: LocalTime | null
  readout?: string | null
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
}

/**
 * The canvas scene behind `?canvas=1` (dev only until the switch, stage C9): the world state built from App's inputs
 * (`useWorld`) and the valley drawn from it. App imports this module lazily, so the world, the model, the painters and
 * the compositor stay out of the production bundle until the switch. The world is left on `window.__world` for
 * inspection.
 */
export default function CanvasScene({ input, ...scene }: Props) {
  const world = useWorld(input)
  useEffect(() => {
    if (world) (window as Window & { __world?: unknown }).__world = world
  }, [world])
  return world ? <SceneCanvas world={world} {...scene} /> : null
}
