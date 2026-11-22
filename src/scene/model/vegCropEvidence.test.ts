import { describe, expect, it, vi } from 'vitest'
import { coverMarks } from '../../data/landmarks/coverMarks'
import { mappedCropArea, type CropArea, type CropKind } from '../../data/landmarks/cropAreas'
import { parseOverpass } from '../../data/landmarks/overpass'
import { loadLandmarkSource } from '../../data/landmarks/useLandmarks'
import * as panorama from '../../data/terrain/panorama'
import { makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { DATUM_PLACES, STILL_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import type { Plane } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { layersOn, sceneModel } from '.'
import { planeVegetationOf } from './landVegetation'
import { planeLayer } from './planes'
import type { LayerOf, SceneBox } from './types'
import { cropBuckets } from './vegCropEvidence'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const COVER = typedCover(1, 'worldcover-2021:local-50m')
const INPUT = makeWorldInput(SHADMOT, '2026-11-17T12:00', { cover: COVER, near: null, far: null, weather: null })

function mapped(kind: CropKind, km: number, half: number, bearing = 180): CropArea {
  const { lat, lon } = panorama.destination(SHADMOT.lat, SHADMOT.lon, km, bearing)
  return { source: 'osm', kind, polygons: [[[
    [lon - half, lat - half], [lon + half, lat - half], [lon + half, lat + half], [lon - half, lat + half], [lon - half, lat - half],
  ]]] }
}

describe('mapped crop evidence from the landmark pipeline', () => {
  it('separates vineyard areas, tagged palms, bare OSM points and synthetic WorldCover glyphs', async () => {
    const geometry = mapped('vineyard', 0.8, 0.001).polygons[0][0].map(([lon, lat]) => ({ lat, lon }))
    const osm = parseOverpass({ elements: [
      { id: 1, type: 'way', tags: { landuse: 'vineyard' }, geometry },
      { id: 2, type: 'node', tags: { landuse: 'orchard', trees: 'date_palms' }, ...geometry[0] },
    ] })
    const synthetic = coverMarks(SHADMOT, COVER, [])
    expect(synthetic.length).toBeGreaterThan(0)
    const loaded = await loadLandmarkSource(SHADMOT, new AbortController().signal, {
      israel: vi.fn().mockResolvedValue(null), overpass: vi.fn().mockResolvedValue(osm),
    })
    const build = makeWorldBuilder()
    const world = build({ ...INPUT, landmarks: [...loaded.sceneMarks, ...synthetic], cropAreas: loaded.cropAreas })
    expect(world.cropAreas?.map((a) => a.kind)).toEqual(['vineyard'])
    const plane: Plane = { points: [[0, 40], [375, 40]], distanceKm: [2, 2] }
    const bucket = cropBuckets(world, 'near', plane)(175, 200)
    expect(bucket?.at(187.5, 0.8)?.kind).toBe('vineyard')
    expect(bucket?.at(187.5, 1.5)).toBeUndefined() // Same bearing, unrelated land behind the vineyard.
    expect(cropBuckets(build({ ...INPUT, landmarks: synthetic }), 'near', plane)(175, 200)).toBeUndefined()
    expect(mappedCropArea({ landuse: 'orchard', trees: 'date_palms' },
      { type: 'Polygon', coordinates: mapped('palm', 1, 0.001).polygons[0] })?.kind).toBe('palm')
    expect(mappedCropArea({ landuse: 'orchard' },
      { type: 'Polygon', coordinates: mapped('palm', 1, 0.001).polygons[0] })?.kind).toBe('orchard')
  })

  it('refreshes both paint keys on same-hour mapped geometry or clear-zone arrival and reuses form on a scrub', () => {
    const build = makeWorldBuilder()
    const near: Plane = { points: [[0, 40], [375, 40]], distanceKm: [0.6, 0.6] }
    const desc = (world: ReturnType<typeof build>, clear: Parameters<typeof planeLayer>[4] = []) =>
      planeLayer({ ...world, terrain: { ...world.terrain, near,
        faces: { ...world.terrain.faces, near: { columns: [], contours: [] } } } }, BOX, 'near', near, clear)!
    const base = desc(build(INPUT))
    const next = { ...INPUT, cropAreas: [mapped('palm', 0.6, 0.01)] }
    const refined = desc(build(next))
    expect(base.vegetation.rows).toHaveLength(0)
    expect(refined.vegetation.rows.length).toBeGreaterThan(0)
    expect(refined.key).not.toBe(base.key)
    expect(refined.light.key).not.toBe(base.light.key)
    const scrub = desc(build({ ...next, selected: '2026-11-17T13:00' }))
    expect(scrub.key).toBe(refined.key)
    expect(scrub.vegetation).toBe(refined.vegetation)
    expect(scrub.light.key).not.toBe(refined.light.key)
    const blocked = desc(build(next), [{ x: 0, y: 43, w: 375, h: 83 }])
    expect(blocked.key).not.toBe(refined.key)
    expect(blocked.light.key).not.toBe(refined.light.key)
    expect(blocked.vegetation.rows).toHaveLength(0)
  })

  it('skips all ground-coordinate crop probes outside the plane bearing or depth', () => {
    const near: Plane = { points: [[0, 40], [375, 40]], distanceKm: [0.6, 0.6] }
    const build = makeWorldBuilder()
    const world = build({ ...INPUT, cropAreas: [mapped('palm', 0.6, 0.0004, 0), mapped('orchard', 2, 0.0004)] })
    const projected = { ...world, terrain: { ...world.terrain, near,
      faces: { ...world.terrain.faces, near: { columns: [], contours: [] } } } }
    const project = vi.spyOn(panorama, 'destination')
    try {
      const descriptor = planeVegetationOf(projected, BOX, 'near', near, [0.3, 0.4, 0.3], [])
      expect(descriptor.rows).toHaveLength(0)
      expect(project).not.toHaveBeenCalled()
    } finally {
      project.mockRestore()
    }
  })

  it('prunes a cell by radial range and keeps first-match order across north and in a mirrored camera', () => {
    const plane: Plane = { points: [[0, 40], [375, 40]], distanceKm: [2, 2] }
    const world = makeWorldBuilder()({ ...INPUT, cropAreas: [mapped('olive', 0.8, 0.001, 0), mapped('orchard', 0.8, 0.001, 0)] })
    for (const handed of [1, -1] as const) {
      const bucket = cropBuckets({ ...world, camera: { ...world.camera, heading: 0, handed } }, 'near', plane)(170, 205)!
      expect(bucket.intersects(175, 200, 0.2, 0.5)).toBe(false)
      expect(bucket.intersects(175, 200, 0.79, 0.81)).toBe(true)
      expect(bucket.at(187.5, 0.8)?.kind).toBe('olive')
    }
    const north = { ...world, camera: { ...world.camera, heading: 0 } }
    const fallback = cropBuckets(north, 'near', { ...plane, distanceKm: [] })(170, 205)
    expect(fallback?.at(187.5, 0.8)?.kind).toBe('olive')
  })

  it('wires real mapped OSM crop areas through loadPlaces and worldInput (Kalya palms & Nahalal olive/orchards)', async () => {
    stubPublicFetch()
    try {
      const kalya = DATUM_PLACES.find((p) => p.id === 'kalya')!
      const nahalal = STILL_PLACES.find((p) => p.id === 'nahalal')!
      const places = await loadPlaces([kalya, nahalal])
      const kaLoaded = places.get('kalya')!
      const nhLoaded = places.get('nahalal')!
      expect(kaLoaded.cropAreas?.some((a) => a.kind === 'palm')).toBe(true)
      expect(nhLoaded.cropAreas?.some((a) => a.kind === 'olive')).toBe(true)
      const build = makeWorldBuilder()
      const kaWorld = build(worldInput(kaLoaded, '2026-02-15T12:00'))
      const nhWorld = build(worldInput(nhLoaded, '2026-02-15T12:00'))
      expect(kaWorld.cropAreas?.length).toBeGreaterThan(0)
      expect(nhWorld.cropAreas?.length).toBeGreaterThan(0)
      const kaNear = layersOn(sceneModel(kaWorld, BOX), 'land')
        .find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!
      const nhNear = layersOn(sceneModel(nhWorld, BOX), 'land')
        .find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!
      expect(kaNear.vegetation.rows.length).toBeGreaterThan(0)
      expect(nhNear.vegetation.rows.length).toBeGreaterThan(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
