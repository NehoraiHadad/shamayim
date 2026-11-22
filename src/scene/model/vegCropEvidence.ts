import type { CropArea } from '../../data/landmarks/cropAreas'
import { destination } from '../../data/terrain/panorama'
import { azimuthAt } from '../../domain/camera'
import { partKey } from '../../world/keys'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import { crestKmAt, faceAtY, fallbackFaceKm } from './faceProjection'
import type { AreaLimit, projectedFootprints } from './vegFootprint'
import { boundsOverlap, localFrame, pointInPolygonXY, quadBounds, toLocalKm, toLocalPolygon } from './vegPolygon'
import { mPerPxAt, ORCHARD_MAX_M_PER_PX } from './vegRules'
import { sampleVegAtKm } from './vegSample'
import { geodesicPad, rayHitsBounds, sectorInPolygon, testSector } from './vegSector'

const EMPTY: readonly CropArea[] = []
const keys = new WeakMap<readonly CropArea[], string>()

export function cropEvidenceKey(world: WorldState): string {
  const areas = world.cropAreas ?? EMPTY
  if (!areas.length) return ''
  let key = keys.get(areas)
  if (!key) keys.set(areas, key = partKey(areas, 9))
  return key
}

interface CropBucket {
  intersects: (left: number, right: number, loKm: number, hiKm: number) => boolean
  at: (refX: number, km: number) => { kind: CropArea['kind']; contains: AreaLimit } | undefined
}

/** Bucket crop shells by visible ground sector. Keep input order for overlapping polygons. */
export function cropBuckets(world: WorldState, name: 'near' | 'far', plane: Plane): (left: number, right: number) => CropBucket | undefined {
  if (!world.cropAreas?.length) return () => undefined
  const bearing = (x: number) => azimuthAt(x / SCENE_W, world.camera)
  const frame = localFrame(world.place.lat, world.place.lon)
  const polygons = world.cropAreas.flatMap(({ kind, polygons }) => polygons.map((rings) => toLocalPolygon(kind, rings, frame)))
  let maxKm = Math.max(crestKmAt(plane, 0), fallbackFaceKm(name, 0, 1), ...plane.distanceKm)
  for (const column of world.terrain.faces[name]?.columns ?? []) {
    for (const point of column.points) maxKm = Math.max(maxKm, point.km)
  }
  const bounds = (left: number, right: number, lo: number, hi: number) => {
    const boxes: ReturnType<typeof quadBounds>[] = []
    const valid = testSector(frame, bearing(left), bearing(right), lo, hi, (quad) => { boxes.push(quadBounds(quad)); return true })
    return valid ? boxes : undefined
  }
  const footprintLimits = new Map<(typeof polygons)[number], AreaLimit>()
  const planePad = geodesicPad(frame, maxKm)
  function limit(p: (typeof polygons)[number]): AreaLimit {
    const found = footprintLimits.get(p)
    if (found) return found
    const distances = new Map<number, { right: number; lo: number; hi: number; inside: boolean }[]>()
    const contains: AreaLimit = ([left, , right], lo, hi) => {
      let checks = distances.get(left)
      if (!checks) distances.set(left, checks = [])
      for (const cached of checks) if (cached.right === right && cached.lo === lo && cached.hi === hi) return cached.inside
      const inside = sectorInPolygon(frame, p, bearing(left), bearing(right), lo, hi)
      checks.push({ right, lo, hi, inside })
      return inside
    }
    if (planePad !== undefined) {
      const { minX, minY, maxX, maxY } = p.rings[0]
      const reach = Math.hypot(Math.max(Math.abs(minX), Math.abs(maxX)), Math.max(Math.abs(minY), Math.abs(maxY)))
      // A geodesic point in this box is at most `reach + planePad` from the eye along the straight ray.
      const pad = geodesicPad(frame, Math.min(maxKm, reach + planePad)) ?? planePad
      const allowsRay = (x: number) => rayHitsBounds(p.rings[0], bearing(x), pad)
      contains.allowsEdges = (left, right) => allowsRay(left) && allowsRay(right)
    }
    footprintLimits.set(p, contains)
    return contains
  }
  return (left: number, right: number) => {
    const bucket = bounds(left, right, 0, maxKm)
    // Keep every candidate when the entire sector does not fit the local longitude chart.
    const nearby = bucket ? polygons.filter((p) => bucket.some((b) => boundsOverlap(b, p.rings[0]))) : polygons
    if (!nearby.length) return
    return {
      intersects: (x0: number, x1: number, lo: number, hi: number) => {
        const cell = bounds(x0, x1, lo, hi)
        return !cell || nearby.some((p) => cell.some((b) => boundsOverlap(b, p.rings[0])))
      },
      at: (refX: number, km: number) => {
        const { lat, lon } = destination(frame.lat0, frame.lon0, km, bearing(refX))
        const [px, py] = toLocalKm(frame, lon, lat)
        const p = nearby.find((p) => pointInPolygonXY(p, px, py))
        if (p) return { kind: p.kind, contains: limit(p) }
      },
    }
  }
}

const SUB_PROBES: readonly [number, number][] = [
  [0, 0.12], [0, 0.42], [0, 0.78],
  [-0.22, 0.14], [0.22, 0.14], [-0.22, 0.50], [0.22, 0.50], [-0.22, 0.82], [0.22, 0.82],
  [-0.40, 0.25], [0.40, 0.25], [-0.40, 0.70], [0.40, 0.70],
]
export const CROP_PROBE_REACH = Math.max(...SUB_PROBES.map(([x]) => Math.abs(x)))
const CREST_CLEARANCE = 1
const probeX = (x: number) => Math.max(1, Math.min(SCENE_W - 1, x))

/** Discover mapped crops between coarse cell centres. Footprint containment is checked separately. */
export function probeCellCropEvidence(
  world: WorldState, plane: Plane, bucket: CropBucket,
  crestAt: (x: number) => number, footAt: (x: number) => number,
  refX: number, colW: number, yTop: number, yBot: number, nRays: number,
  footprintsOf: () => ReturnType<typeof projectedFootprints>,
) {
  const left = probeX(refX - CROP_PROBE_REACH * colW), right = probeX(refX + CROP_PROBE_REACH * colW)
  const [lo, hi] = footprintsOf().cropDepth([left, yTop, right, yBot], CREST_CLEARANCE)
  if (mPerPxAt(lo * 1000, world.camera) > ORCHARD_MAX_M_PER_PX || !bucket.intersects(left, right, lo, hi)) return
  for (const [ox, fyFrac] of SUB_PROBES) {
    const sxPos = probeX(refX + ox * colW)
    const sCy = crestAt(sxPos), sFy = footAt(sxPos)
    const syPos = Math.max(sCy + CREST_CLEARANCE, yTop + fyFrac * (yBot - yTop))
    if (syPos >= sFy - 0.8) continue
    const hitFace = faceAtY(world, 'near', plane, sxPos, sCy, sFy, syPos)
    if (mPerPxAt(hitFace.km * 1000, world.camera) > ORCHARD_MAX_M_PER_PX) continue
    const hit = bucket.at(sxPos, hitFace.km)
    if (!hit) continue
    const hitSample = sampleVegAtKm(world.land, (sxPos / SCENE_W) * nRays, hitFace.km)
    if (hitSample.cover !== 1 && hitSample.cover !== 4) continue
    return { evidence: hit, x: sxPos, km: hitFace.km, slope: hitFace.slope, sample: hitSample }
  }
}
