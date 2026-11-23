import { groundAt as lineAt } from '../../world/sceneLight'
import { ABOVE_PAD } from '../../world/outside'
import { SCENE_H } from '../../world/sceneBox'
import type { OutsideView, WorldState } from '../../world/types'
import { facadeTwilight } from './buildingExposure'
import { faceAtY, localFootY } from './faceProjection'

/** The km of the painted land where a foot shows (Infinity against the sky). */
function paintedKm(world: WorldState, x: number, y: number) {
  for (const name of ['near', 'far', 'back'] as const) {
    const plane = world.terrain[name]
    if (!plane?.points.length) continue
    const crest = lineAt(plane.points, x)
    if (y < crest - (name === 'near' ? ABOVE_PAD + .5 : -.5)) continue
    return faceAtY(world, name, plane, x, crest, localFootY(world, name, x, crest, SCENE_H), Math.max(y, crest)).km
  }
  return Infinity
}

/** The place's own ground as one distance: the mean of the land painted under its walls (km). */
export function townGroundKm(world: WorldState, { skyline, land }: OutsideView) {
  if (land) return land.km
  const feet = [...skyline.boxes.map(b => paintedKm(world, b.x, b.foot)), ...skyline.towers.map(t => paintedKm(world, t.x, t.baseY))]
    .filter(Number.isFinite)
  return feet.length ? feet.reduce((sum, km) => sum + km, 0) / feet.length : Infinity
}

/** A wall's own distance (no farther than ground drawn for the place) in eighths of an octave: the nearest rows differ most by it. */
export const wallStep = (km: number) => 2 ** (Math.round(Math.log2(Math.max(.1, km)) * 8) / 8)

/**
 * The path of air a wall of the place is seen through (km to km): its own. While twilight exposes the walls with their
 * street, they share its air too, under one cap for the whole town. Never the land behind this one wall: that steps from
 * column to column.
 */
export function wallAir(world: WorldState, groundKm: number) {
  const share = facadeTwilight(world.bodies.sun.altitude)
  return (km: number) => km + (Math.min(km, groundKm) - km) * share
}
