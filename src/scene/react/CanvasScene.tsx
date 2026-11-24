import { useEffect, useMemo, useState } from 'react'
import { loadBounds, type BoundsFile } from '../../data/city/bounds'
import { loadFar, type FarData } from '../../data/city/farData'
import { loadLandCover, type LandCover } from '../../data/land/landData'
import { useVillageTile } from '../../data/village/useVillageTile'
import { loadWaterMask, type WaterMask } from '../../data/water/waterMask'
import type { Forecast, LocalTime } from '../../domain/types'
import { pinnedTime } from '../../ui/devParams'
import type { WorldInput } from '../../world/types'
import { DEFAULT_STYLE, type SceneStyle } from '../paint/painters'
import { forcedStyle } from './forcedStyle'
import { SceneCanvas } from './SceneCanvas'
import { useLifeClock } from './useLifeClock'
import type { WearLine } from './WearCanvas'
import { useWorld } from './useWorld'

interface Props {
  input: WorldInput
  forecast: Forecast
  now: LocalTime
  selected: LocalTime | null
  temperature: number
  readout?: string | null
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
  /** The wear card's line: drawn from this world into the card. */
  wear?: WearLine | null
  /** The hand the valley is painted with; it may change while mounted. */
  sceneStyle?: SceneStyle
  /** Told the waters drawn in a place's picture, for the page's line about it. */
  onWaters?: (placeId: string, names: string[]) => void
}

/**
 * The valley scene: the world state built from App's inputs (`useWorld`) and the valley drawn from it. App imports this
 * module lazily, so the world, the model, the painters and the compositor load as their own chunk after the page's first
 * paint. The world is left on `window.__world` for inspection.
 */
export default function CanvasScene({ input, sceneStyle = DEFAULT_STYLE, onWaters, ...scene }: Props) {
  const { offsetMinutes, laidAt, sinceS } = useLifeClock(scene.selected ?? scene.now, scene.selected ?? pinnedTime(), input.place.timezone)
  const life = useMemo(() => ({ laidAt, sinceS }), [laidAt, sinceS])
  // The far towns' raster (`far.json`), loaded once; the world places the towns from it.
  const [far, setFar] = useState<FarData | null>(null)
  // The places' own boundaries and the large water (C5: the outside view's frame and a coastal place's sea), loaded once.
  const [bounds, setBounds] = useState<BoundsFile | null>(null)
  const [waterMask, setWaterMask] = useState<WaterMask | null>(null)
  // The land cover round the place: every place's built cells and trees (C5).
  const [cover, setCover] = useState<{ id: string; cover: LandCover | null } | null>(null)
  const placeId = input.place.id
  useEffect(() => {
    let active = true
    void loadLandCover(input.place, undefined, 6).then((data) => { if (active) setCover({ id: placeId, cover: data }) })
      .catch(() => { if (active) setCover({ id: placeId, cover: null }) })
    return () => { active = false }
  }, [input.place, placeId])
  useEffect(() => {
    let active = true
    void loadFar().then((data) => { if (active) setFar(data) })
    void loadBounds().then((data) => { if (active) setBounds(data) })
    void loadWaterMask().then((data) => { if (active) setWaterMask(data) })
    return () => { active = false }
  }, [])
  const village = useVillageTile(input.place)
  // The cover waits for the village's tile: what is drawn of a place is drawn once.
  const placeCover = cover?.id === placeId && village !== undefined ? cover.cover : null
  const full = useMemo(() => ({ ...input, far, bounds, waterMask, cover: placeCover, village, lifeOffsetMinutes: offsetMinutes }),
    [input, far, bounds, waterMask, placeCover, village, offsetMinutes])
  const world = useWorld(full)
  useEffect(() => {
    if (world) (window as Window & { __world?: unknown }).__world = world
  }, [world])
  const waters = world?.watersShown
  useEffect(() => {
    if (waters) onWaters?.(placeId, waters)
  }, [waters, placeId, onWaters])
  return world ? <SceneCanvas world={world} life={life} style={forcedStyle() ?? sceneStyle} {...scene} /> : null
}
