import type { CropArea, CropRing } from '../../data/landmarks/cropAreas'
import { destination, EARTH_R_KM } from '../../data/terrain/panorama'
import { azimuthAt } from '../../domain/camera'
import { partKey } from '../../world/keys'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { Footprint } from './vegFootprint'

const RAD = Math.PI / 180
const EMPTY: readonly CropArea[] = []
const keys = new WeakMap<readonly CropArea[], string>()

export function cropEvidenceKey(world: WorldState): string {
  const areas = world.cropAreas ?? EMPTY
  if (!areas.length) return ''
  let key = keys.get(areas)
  if (!key) keys.set(areas, key = partKey(areas, 9))
  return key
}

/** Local equirectangular offsets (km) around the sampled ground, sufficient for the small mapped blocks drawn here. */
function ringClearance(ring: CropRing, lat: number, lon: number): number {
  let inside = false, edge = Infinity
  const eastKm = EARTH_R_KM * RAD * Math.cos(lat * RAD), northKm = EARTH_R_KM * RAD
  for (let i = 1; i < ring.length; i++) {
    const [a, b] = [ring[i - 1], ring[i]]
    const ax = ((((a[0] - lon) % 360) + 540) % 360 - 180) * eastKm, ay = (a[1] - lat) * northKm
    const bx = ((((b[0] - lon) % 360) + 540) % 360 - 180) * eastKm, by = (b[1] - lat) * northKm
    if ((ay > 0) !== (by > 0) && ax + (bx - ax) * (-ay / (by - ay)) > 0) inside = !inside
    const dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy
    const t = length2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2)) : 0
    edge = Math.min(edge, Math.hypot(ax + t * dx, ay + t * dy))
  }
  return inside ? edge : -edge
}

function clearance(rings: readonly CropRing[], lat: number, lon: number): number {
  const outer = ringClearance(rings[0], lat, lon)
  return outer > 0 ? Math.min(outer, ...rings.slice(1).map((hole) => -ringClearance(hole, lat, lon))) : outer
}

export function cropEvidence(world: WorldState) {
  // Quick reject of distant polygons before the point-in-polygon check. Wrap longitude only in the exact test.
  const polygons = (world.cropAreas ?? EMPTY).flatMap(({ kind, polygons }) => polygons.map((rings) => {
    let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity
    for (const [lon, lat] of rings[0]) {
      south = Math.min(south, lat); north = Math.max(north, lat)
      west = Math.min(west, lon); east = Math.max(east, lon)
    }
    return { kind, rings, south, north, west, east }
  }))
  return (refX: number, km: number) => {
    if (!polygons.length) return
    const { lat, lon } = destination(world.place.lat, world.place.lon, km, azimuthAt(refX / SCENE_W, world.camera))
    for (const p of polygons) {
      if (lat < p.south || lat > p.north || (p.east - p.west < 180 && (lon < p.west || lon > p.east))) continue
      const availableKm = clearance(p.rings, lat, lon)
      if (availableKm <= 0) continue
      return {
        kind: p.kind,
        contains: ([left, , right]: Footprint, loKm: number, hiKm: number) => {
          const turn = Math.max(Math.abs(left - refX), Math.abs(right - refX)) * RAD / world.camera.pxPerDeg
          // A radial leg followed by a small-circle arc bounds displacement anywhere within the footprint.
          // Keep one percent inside the local planar boundary (projection approximation).
          return Math.max(Math.abs(loKm - km), Math.abs(hiKm - km)) + hiKm * turn < availableKm * 0.99
        },
      }
    }
  }
}
