import { useEffect, useMemo, useState } from 'react'
import { loadFar, type FarData } from '../../data/city/farData'
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
  // The far towns' raster (`far.json`), loaded once; the world places the towns from it.
  const [far, setFar] = useState<FarData | null>(null)
  useEffect(() => {
    let active = true
    void loadFar().then((data) => { if (active) setFar(data) })
    return () => { active = false }
  }, [])
  const full = useMemo(() => ({ ...input, far }), [input, far])
  const world = useWorld(full)
  useEffect(() => {
    if (world) (window as Window & { __world?: unknown }).__world = world
  }, [world])
  return world ? <SceneCanvas world={world} {...scene} /> : null
}
