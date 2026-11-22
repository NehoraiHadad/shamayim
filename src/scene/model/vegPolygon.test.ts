import { describe, expect, it } from 'vitest'
import type { CropArea, CropRing } from '../../data/landmarks/cropAreas'
import { destination, EARTH_R_KM } from '../../data/terrain/panorama'
import { azimuthAt } from '../../domain/camera'
import { makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { SCENE_W } from '../../world/sceneBox'
import type { Plane, WorldState } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { cropEvidence } from './vegCropEvidence'
import { faceAtY } from './faceProjection'
import { planeLayer } from './planes'
import type { SceneBox } from './types'
import { localFrame, pointInPolygonXY, quadInPolygon, toLocalKm, toLocalPolygon } from './vegPolygon'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const RAD = Math.PI / 180
const EAST_KM = EARTH_R_KM * RAD * Math.cos(SHADMOT.lat * RAD)
const NORTH_KM = EARTH_R_KM * RAD

function rectRing(e0: number, e1: number, n0: number, n1: number): CropRing {
  const pt = (e: number, n: number): [number, number] => [SHADMOT.lon + e / EAST_KM, SHADMOT.lat + n / NORTH_KM]
  return [pt(e0, n0), pt(e1, n0), pt(e1, n1), pt(e0, n1), pt(e0, n0)]
}

function slopingCropWorld(cropAreas: CropArea[]): { world: WorldState; near: Plane } {
  const near: Plane = { points: [[0, 40], [375, 40]], distanceKm: [1.1, 1.1] }
  const build = makeWorldBuilder()
  const base = build({
    ...makeWorldInput(SHADMOT, '2026-02-15T12:00', { cover: typedCover(4, 'worldcover-2021:local-50m'), near: null, far: null, weather: null }),
    cropAreas,
  })
  const cols = [0, 375].map((x) => ({ x, crest: 40, points: [{ y: 126, km: 0.45, h: 0, slope: 0.04 }] }))
  const world: WorldState = {
    ...base,
    terrain: { ...base.terrain, near, faces: { ...base.terrain.faces, near: { columns: cols, contours: [] } } },
  }
  return { world, near }
}

function sampleRowLocalPts(world: WorldState, near: Plane, rows: Float32Array, steps = 100): [number, number][] {
  const frame = localFrame(world.place.lat, world.place.lon)
  const pts: [number, number][] = []
  for (let i = 0; i < rows.length; i += 6) {
    const [x0, y0, x1, y1] = [rows[i], rows[i + 1], rows[i + 2], rows[i + 3]]
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t
      const { km } = faceAtY(world, 'near', near, x, 40, 128, y)
      const { lat, lon } = destination(world.place.lat, world.place.lon, km, azimuthAt(x / SCENE_W, world.camera))
      pts.push(toLocalKm(frame, lon, lat))
    }
  }
  return pts
}

describe('mapped orchard footprint containment', () => {
  it('clips entire ring edges including an enclosed hole and a concave shell notch', () => {
    const frame = localFrame(SHADMOT.lat, SHADMOT.lon)
    const holePoly = toLocalPolygon('palm', [rectRing(-0.5, 0.5, -1.0, -0.4), rectRing(-0.02, 0.02, -0.72, -0.68)], frame)
    expect(quadInPolygon(holePoly, [[-0.1, -0.8], [0.1, -0.8], [0.1, -0.6], [-0.1, -0.6]])).toBe(false)
    expect(quadInPolygon(holePoly, [[0.1, -0.8], [0.3, -0.8], [0.3, -0.6], [0.1, -0.6]])).toBe(true)

    const concaveOuter: CropRing = [
      [-0.5, -1.0], [0.5, -1.0], [0.5, -0.4], [0.02, -0.4], [0.0, -0.70], [-0.02, -0.4], [-0.5, -0.4], [-0.5, -1.0],
    ].map(([e, n]): [number, number] => [SHADMOT.lon + e / EAST_KM, SHADMOT.lat + n / NORTH_KM])
    const concavePoly = toLocalPolygon('palm', [concaveOuter], frame)
    expect(quadInPolygon(concavePoly, [[-0.2, -0.75], [0.2, -0.75], [0.2, -0.65], [-0.2, -0.65]])).toBe(false)
  })

  it('clips painted rows around an off-centre orchard hole and leaves usable rows', () => {
    const frame = localFrame(SHADMOT.lat, SHADMOT.lon)
    // A 10 × 12 m unmapped patch falls between the old row probes near the east edge of the orchard.
    const outer = rectRing(-0.6, 0.6, -1.15, -0.42)
    const hole = rectRing(0.5535, 0.5635, -0.5422, -0.5302)
    const solid = slopingCropWorld([{ source: 'osm', kind: 'palm', polygons: [[outer]] }])
    const solidVeg = planeLayer(solid.world, BOX, 'near', solid.near, [])!.vegetation
    const holePoly = toLocalPolygon('palm', [hole], frame)
    expect(sampleRowLocalPts(solid.world, solid.near, solidVeg.rows)
      .some(([x, y]) => pointInPolygonXY(holePoly, x, y))).toBe(true)

    const holed = slopingCropWorld([{ source: 'osm', kind: 'palm', polygons: [[outer, hole]] }])
    const holedVeg = planeLayer(holed.world, BOX, 'near', holed.near, [])!.vegetation
    expect(holedVeg.rows.length).toBeGreaterThan(0)
    const poly = toLocalPolygon('palm', [outer, hole], frame)
    const pts = sampleRowLocalPts(holed.world, holed.near, holedVeg.rows, 100)
    for (const [px, py] of pts) expect(pointInPolygonXY(poly, px, py)).toBe(true)
    for (let i = 0; i < holedVeg.trees.length; i += 6) {
      const { km } = faceAtY(holed.world, 'near', holed.near, holedVeg.trees[i], 40, 128, holedVeg.trees[i + 1])
      const pos = destination(SHADMOT.lat, SHADMOT.lon, km, azimuthAt(holedVeg.trees[i] / SCENE_W, holed.world.camera))
      expect(pointInPolygonXY(poly, ...toLocalKm(frame, pos.lon, pos.lat))).toBe(true)
    }
  })

  it('never bridges an unmapped gap between two separate same-kind polygons', () => {
    const frame = localFrame(SHADMOT.lat, SHADMOT.lon)
    // Radial gap (-0.77..-0.72 km) and azimuthal gap (-0.025..+0.025 km east) between separate palm polygons.
    const pairs: [CropRing, CropRing][] = [
      [rectRing(-0.6, 0.6, -0.72, -0.42), rectRing(-0.6, 0.6, -1.15, -0.77)],
      [rectRing(-0.6, -0.025, -1.15, -0.42), rectRing(0.025, 0.6, -1.15, -0.42)],
    ]
    for (const [ringA, ringB] of pairs) {
      const split = slopingCropWorld([
        { source: 'osm', kind: 'palm', polygons: [[ringA]] },
        { source: 'osm', kind: 'palm', polygons: [[ringB]] },
      ])
      const veg = planeLayer(split.world, BOX, 'near', split.near, [])!.vegetation
      expect(veg.rows.length).toBeGreaterThan(0)
      const pA = toLocalPolygon('palm', [ringA], frame), pB = toLocalPolygon('palm', [ringB], frame)
      for (const [px, py] of sampleRowLocalPts(split.world, split.near, veg.rows, 100)) {
        expect(pointInPolygonXY(pA, px, py) || pointInPolygonXY(pB, px, py)).toBe(true)
      }
    }
  })

  it('keeps one polygon identity even when members of a same-kind multipolygon overlap', () => {
    const { world } = slopingCropWorld([{ source: 'osm', kind: 'palm', polygons: [
      [rectRing(-0.4, 0.4, -0.85, -0.45)], [rectRing(-0.4, 0.4, -1.1, -0.8)],
    ] }])
    const at = cropEvidence(world)
    const footprint = [183, 60, 192, 68] as const
    expect(at(187.5, 0.7)?.contains(footprint, 0.6, 0.75)).toBe(true)
    expect(at(187.5, 0.7)?.contains(footprint, 0.6, 0.95)).toBe(false)
  })
})
