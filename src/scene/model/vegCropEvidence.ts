import type { CropArea, CropRing } from '../../data/landmarks/cropAreas'
import { destination } from '../../data/terrain/panorama'
import { azimuthAt } from '../../domain/camera'
import { partKey } from '../../world/keys'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import { faceAtY, type PlaneName } from './faceProjection'
import type { Footprint } from './vegFootprint'
import { mPerPxAt, ORCHARD_MAX_M_PER_PX } from './vegRules'
import { sampleVegAtKm } from './vegSample'

const EMPTY: readonly CropArea[] = []
const keys = new WeakMap<readonly CropArea[], string>()

export function cropEvidenceKey(world: WorldState): string {
  const areas = world.cropAreas ?? EMPTY
  if (!areas.length) return ''
  let key = keys.get(areas)
  if (!key) keys.set(areas, key = partKey(areas, 9))
  return key
}

/** Exact point-in-ring test with antimeridian-safe local longitude offset. */
function pointInRing(ring: CropRing, lat: number, lon: number): boolean {
  let inside = false
  for (let i = 1; i < ring.length; i++) {
    const [a, b] = [ring[i - 1], ring[i]]
    const ax = ((((a[0] - lon) % 360) + 540) % 360 - 180), ay = a[1] - lat
    const bx = ((((b[0] - lon) % 360) + 540) % 360 - 180), by = b[1] - lat
    if ((ay > 0) !== (by > 0) && ax + (bx - ax) * (-ay / (by - ay)) > 0) inside = !inside
  }
  return inside
}

function pointInRings(rings: readonly CropRing[], lat: number, lon: number): boolean {
  if (!pointInRing(rings[0], lat, lon)) return false
  for (let i = 1; i < rings.length; i++) if (pointInRing(rings[i], lat, lon)) return false
  return true
}

export function cropEvidence(world: WorldState) {
  // Quick reject of distant polygons before the exact point-in-polygon check. Wrap longitude only in the exact test.
  const polygons = (world.cropAreas ?? EMPTY).flatMap(({ kind, polygons }) => polygons.map((rings) => {
    let south = Infinity, north = -Infinity, west = Infinity, east = -Infinity
    for (const [lon, lat] of rings[0]) {
      south = Math.min(south, lat); north = Math.max(north, lat)
      west = Math.min(west, lon); east = Math.max(east, lon)
    }
    return { kind, rings, south, north, west, east }
  }))
  const insideKind = (kind: CropArea['kind'], x: number, dKm: number): boolean => {
    const { lat, lon } = destination(world.place.lat, world.place.lon, dKm, azimuthAt(x / SCENE_W, world.camera))
    for (const p of polygons) {
      if (p.kind !== kind) continue
      if (lat < p.south || lat > p.north || (p.east - p.west < 180 && (lon < p.west || lon > p.east))) continue
      if (pointInRings(p.rings, lat, lon)) return true
    }
    return false
  }
  return (refX: number, km: number) => {
    if (!polygons.length) return
    const { lat, lon } = destination(world.place.lat, world.place.lon, km, azimuthAt(refX / SCENE_W, world.camera))
    for (const p of polygons) {
      if (lat < p.south || lat > p.north || (p.east - p.west < 180 && (lon < p.west || lon > p.east))) continue
      if (!pointInRings(p.rings, lat, lon)) continue
      const kind = p.kind
      return {
        kind,
        contains: ([left, , right]: Footprint, loKm: number, hiKm: number) => {
          const midX = (left + right) * 0.5, midKm = (loKm + hiKm) * 0.5
          // Every corner, edge midpoint and centre of the projected footprint must stay inside a mapped polygon of this kind.
          return insideKind(kind, left, loKm) && insideKind(kind, right, loKm)
            && insideKind(kind, left, hiKm) && insideKind(kind, right, hiKm)
            && insideKind(kind, midX, loKm) && insideKind(kind, midX, hiKm)
            && insideKind(kind, left, midKm) && insideKind(kind, right, midKm)
            && insideKind(kind, midX, midKm)
        },
      }
    }
  }
}

const SUB_PROBES: readonly [number, number][] = [
  [0, 0.12], [0, 0.42], [0, 0.78],
  [-0.22, 0.14], [0.22, 0.14], [-0.22, 0.50], [0.22, 0.50], [-0.22, 0.82], [0.22, 0.82],
  [-0.40, 0.25], [0.40, 0.25], [-0.40, 0.70], [0.40, 0.70],
]

/** Deterministic sub-cell probe so 100–400 m mapped OSM orchards inside a coarse cell are never skipped. */
export function probeCellCropEvidence(
  world: WorldState, name: PlaneName, plane: Plane,
  evidenceAt: ReturnType<typeof cropEvidence>,
  crestAt: (x: number) => number, footAt: (x: number) => number,
  refX: number, colW: number, yTop: number, yBot: number, nRays: number,
) {
  if (name !== 'near' || !world.cropAreas?.length) return undefined
  for (const [ox, fyFrac] of SUB_PROBES) {
    const sxPos = Math.max(1, Math.min(SCENE_W - 1, refX + ox * colW))
    const sCy = crestAt(sxPos), sFy = footAt(sxPos)
    const syPos = Math.max(sCy + 1.0, yTop + fyFrac * (yBot - yTop))
    if (syPos >= sFy - 0.8) continue
    const hitFace = faceAtY(world, name, plane, sxPos, sCy, sFy, syPos)
    if (mPerPxAt(hitFace.km * 1000, world.camera) > ORCHARD_MAX_M_PER_PX) continue
    const hitSample = sampleVegAtKm(world.land, (sxPos / SCENE_W) * nRays, hitFace.km)
    if (hitSample.cover !== 1 && hitSample.cover !== 4) continue
    const hit = evidenceAt(sxPos, hitFace.km)
    if (hit) return { evidence: hit, x: sxPos, km: hitFace.km, slope: hitFace.slope, cover: hitSample.cover }
  }
  return undefined
}
