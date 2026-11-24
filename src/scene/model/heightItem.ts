import { labelTone } from '../../theme/labelTone'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import { hazeOf, toneAt } from './landVeil'
import { hexOf, mixRgb } from './tone'
import type { OverlayItem } from './types'

/** How much of the ground behind the letters a full fog covers (its drifting bank, `mist.ts`). */
const FOG_COVER = .6

/** The ground behind the letters as seen through the air. */
function landTone(world: WorldState): string {
  const { place3, air } = world
  const haze = hazeOf(world)
  const land = toneAt(world, place3.kind === 'outside' ? place3.baseKm : 0, haze)
  return hexOf(mixRgb(land, haze, FOG_COVER * (air.mist?.fog ?? 0)))
}

/** The place's height, its tick and its exact spot at the figure's width, in the colours of the shown hour. */
export function heightItem(world: WorldState, width: number): Extract<OverlayItem, { kind: 'height' }> {
  const { text, x, y, on, tick } = world.labels.height, { dot } = world.place3
  const sx = width / SCENE_W, { palette } = world.light
  return { kind: 'height', text, x: x * sx, y, tick, spot: { x: dot.x * sx, y: dot.y },
    tone: labelTone(palette, on, landTone(world)), fill: palette.accent, rim: palette.ridgeNear }
}
