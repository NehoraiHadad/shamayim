import type { CropArea } from '../../data/landmarks/cropAreas'
import { destination } from '../../data/terrain/panorama'
import { azimuthAt } from '../../domain/camera'
import { partKey } from '../../world/keys'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import { faceAtY, type PlaneName } from './faceProjection'
import type { Footprint } from './vegFootprint'
import { localFrame, pointInPolygonXY, toLocalKm, toLocalPolygon } from './vegPolygon'
import { mPerPxAt, ORCHARD_MAX_M_PER_PX } from './vegRules'
import { sampleVegAtKm } from './vegSample'
import { sectorInPolygon } from './vegSector'

const EMPTY: readonly CropArea[] = []
const keys = new WeakMap<readonly CropArea[], string>()

export function cropEvidenceKey(world: WorldState): string {
  const areas = world.cropAreas ?? EMPTY
  if (!areas.length) return ''
  let key = keys.get(areas)
  if (!key) keys.set(areas, key = partKey(areas, 9))
  return key
}

export function cropEvidence(world: WorldState) {
  const bearing = (x: number) => azimuthAt(x / SCENE_W, world.camera)
  const frame = localFrame(world.place.lat, world.place.lon)
  const polygons = (world.cropAreas ?? EMPTY).flatMap(({ kind, polygons }) =>
    polygons.map((rings) => toLocalPolygon(kind, rings, frame)),
  )
  return (refX: number, km: number) => {
    if (!polygons.length) return
    const { lat, lon } = destination(frame.lat0, frame.lon0, km, bearing(refX))
    const [px, py] = toLocalKm(frame, lon, lat)
    for (const p of polygons) {
      if (!pointInPolygonXY(p, px, py)) continue
      return {
        kind: p.kind,
        contains: ([left, , right]: Footprint, loKm: number, hiKm: number) =>
          sectorInPolygon(frame, p, bearing(left), bearing(right), loKm, hiKm),
      }
    }
  }
}

const SUB_PROBES: readonly [number, number][] = [
  [0, 0.12], [0, 0.42], [0, 0.78],
  [-0.22, 0.14], [0.22, 0.14], [-0.22, 0.50], [0.22, 0.50], [-0.22, 0.82], [0.22, 0.82],
  [-0.40, 0.25], [0.40, 0.25], [-0.40, 0.70], [0.40, 0.70],
]

/** Discover mapped crops between coarse cell centres. Footprint containment is checked separately. */
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
