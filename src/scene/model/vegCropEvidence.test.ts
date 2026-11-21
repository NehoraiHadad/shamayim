import { describe, expect, it, vi } from 'vitest'
import { coverMarks } from '../../data/landmarks/coverMarks'
import { mappedCropArea, type CropArea, type CropKind } from '../../data/landmarks/cropAreas'
import { parseOverpass } from '../../data/landmarks/overpass'
import { loadLandmarkSource } from '../../data/landmarks/useLandmarks'
import { destination } from '../../data/terrain/panorama'
import { makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import type { Plane } from '../../world/types'
import { makeWorldBuilder } from '../../world/world'
import { planeLayer } from './planes'
import type { SceneBox } from './types'
import { cropEvidence } from './vegCropEvidence'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const COVER = typedCover(1, 'worldcover-2021:local-50m')
const INPUT = makeWorldInput(SHADMOT, '2026-11-17T12:00', { cover: COVER, near: null, far: null, weather: null })

function mapped(kind: CropKind, km: number, half: number): CropArea {
  const { lat, lon } = destination(SHADMOT.lat, SHADMOT.lon, km, 180)
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
    const at = cropEvidence(world)
    expect(at(187.5, 0.8)?.kind).toBe('vineyard')
    expect(at(187.5, 1.5)).toBeUndefined() // Same bearing, unrelated land behind the vineyard.
    expect(cropEvidence(build({ ...INPUT, landmarks: synthetic }))(187.5, 0.8)).toBeUndefined()
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
})
