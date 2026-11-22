import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import type { Box } from '../../world/layout'
import type { LayerOf } from './types'
import { outsideRidge } from '../../world/outsideDepth'

/** Depths use the receiving layer's eye. Outside masses use beyondKm(frame, baseKm, dx, dy).
 * A separate foreground layer occludes by painter order, without comparing the two distance frames. */
export interface DrawnMass {
  /** Actual supporting mass identity, so it cannot hide its own mark. */
  id?: string
  left: number
  right: number
  top: number
  km: number
  alwaysInFront?: true
}

export const massAt = (x: number, w: number, top: number, km: number, id?: string): DrawnMass =>
  ({ left: x - w / 2, right: x + w / 2, top, km, ...(id ? { id } : {}) })

export const coversFoot = (mass: DrawnMass, foot: Box, km: number) =>
  (mass.alwaysInFront || mass.km < km) && mass.left < foot.right && mass.right > foot.left && mass.top < foot.bottom

/** The town seat extends at least one px into the ridge to close the seam between block and ground. */
const SEAT_CONTACT_PX = 1

/** Screen spans where a drawn ridge is both nearer than the glyph and higher than its foot. */
function ridgeSpans({ points, distanceKm }: Pick<Plane, 'points' | 'distanceKm'>, sx: number, foot: number, km:
   number) {
  const spans: { left: number; right: number }[] = []
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i]
    if (bx <= ax) continue
    let from = 0, to = 1
    for (const [a, b, limit] of [[distanceKm[i - 1], distanceKm[i], km], [ay, by, foot]]) {
      if (a >= limit && b >= limit) { to = 0; break }
      if (a >= limit) from = Math.max(from, (limit - a) / (b - a))
      if (b >= limit) to = Math.min(to, (limit - a) / (b - a))
    }
    if (to > from) spans.push({ left: (ax + from * (bx - ax)) * sx, right: (ax + to * (bx - ax)) * sx })
  }
  return spans
}

/** Outside depths use beyondKm and the transported near ridge; own land is on that same frame.
 * Far marks use the panorama eye. Far/back ridges paint beneath both layers and cannot hide their feet. */
export function footSpans(world: WorldState, width: number, masses: readonly DrawnMass[], base: number, km: number,
  seated = false, layer: 'outside' | 'far' = 'outside', supportId?: string, skipRidge?: 'near' | 'land') {
  const spans = masses.filter(mass => (!supportId || mass.id !== supportId) && (mass.alwaysInFront || mass.km < km) &&
     mass.top < base)
    .map(({ left, right }) => ({ left, right }))
  const near = layer === 'outside' ? outsideRidge(world) : world.terrain.near
  const sx = width / SCENE_W, foot = base - (seated ? SEAT_CONTACT_PX : 0)
  if (skipRidge !== 'near') spans.push(...ridgeSpans(near, sx, foot, km))
  const land = world.place3.kind === 'outside' && world.place3.land
  if (land && skipRidge !== 'land') spans.push(...ridgeSpans({ points: land.top,
    distanceKm: land.top.map(() => layer === 'outside' ? land.km : 0) }, sx, foot, km))
  return spans
}

/** The far-city layer has already applied its text and visibility culls. */
export function farMasses(towns: LayerOf<'farCities'> | null): DrawnMass[] {
  return towns?.tiers.flatMap((tier) => [
    ...tier.blocks.map((b) => massAt(b.x + b.w / 2, b.w, b.base - b.h, b.km)),
    ...tier.mass.flatMap(({ boxes }) => boxes.flatMap((b) => typeof b.km === 'number' ? [massAt(b.x + b.w / 2, b.w,
       b.y, b.km, b.townId === undefined ? undefined : `far-town:${b.townId}`)] : [])),
  ]) ?? []
}

