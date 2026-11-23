import { ABOVE_PAD } from '../../world/outside'
import type { WorldState } from '../../world/types'
import { outsideRidge } from '../../world/outsideDepth'

/**
 * The farthest anything can be where it is seen against the land (C9 defect 1): a thing whose foot shows in front of a
 * plane of the land stands nearer than that land, so it is never hazier than it (scene x, land px y → km; Infinity
  * where
 * the foot is seen against the sky). The place's far rows over the near ridge then take its haze, not the far air's.
 */
export function landBehind(world: WorldState): (x: number, y: number) => number {
  const planes = [world.terrain.near, world.terrain.far, world.terrain.back].filter((p): p is NonNullable<typeof p> =>
     Boolean(p?.points.length))
  const along = (pts: readonly (readonly [number, number])[], kms: readonly number[]) => (x: number): [number,
     number] => {
    if (x <= pts[0][0]) return [pts[0][1], kms[0]]
    if (x >= pts.at(-1)![0]) return [pts.at(-1)![1], kms.at(-1)!]
    let lo = 0, hi = pts.length - 1
    while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] >= x) hi = mid; else lo = mid + 1 }
    const [ax, ay] = pts[lo - 1], [bx, by] = pts[lo]
    const t = (x - ax) / Math.max(1e-6, bx - ax)
    return [ay + (by - ay) * t, kms[lo - 1] + (kms[lo] - kms[lo - 1]) * t]
  }
  // The near ridge is the land the place stands on: a row may rise over its line by the lie's pad on its own ground;
  // and
  // where the place's own ground is drawn over the line, that ground (at its distance) is what it stands on.
  const view = world.place3.kind === 'outside' ? world.place3 : null
  const own = view?.land ? { x0: view.land.top[0][0], x1: view.land.top.at(-1)![0],
    top: along(view.land.top, view.land.top.map(() => view.land!.km)) } : null
  const crests = planes.map((given, i) => {
    const plane = outsideRidge(world, given)
    return { at: along(plane.points, plane.hazeKm ?? plane.distanceKm), pad: i === 0 ? ABOVE_PAD + 0.5 : -0.5 }
  })
  return (x, y) => {
    if (own && x >= own.x0 && x <= own.x1) {
      const [cy, km] = own.top(x)
      if (y >= cy - 0.5) return Math.min(km, crests[0]?.at(x)[1] ?? km)
    }
    for (const crest of crests) {
      const [cy, km] = crest.at(x)
      if (y >= cy - crest.pad) return km
    }
    return Infinity
  }
}
