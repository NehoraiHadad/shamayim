import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { seeded } from '../../data/landmarks/hash'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LivingLand, LivingLandSample } from '../../world/landLiving'
import type { WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { faceAtY } from './faceProjection'
import { groundForm } from './ground'
import { planeSurfaceOf } from './landColour'
import { planeVegetationOf } from './landVegetation'
import type { SceneBox } from './types'
import { addFieldParcel } from './vegAgriBuilders'
import { addOrchardBlock } from './vegOrchard'
import { emptyBuf, flatEnv } from './vegBuilderFixtures.testkit'
import { sampleCoverAtKm, sampleVegAtKm } from './vegSample'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces() })
afterAll(() => { vi.unstubAllGlobals() })

const cell = (cover: number | null, ndvi = 0.55, dryness = 0.35): LivingLandSample => ({
  cover, coverSource: 'worldcover-2021:local-50m', albedo: cover === 6 ? [0.65, 0.55, 0.36] : [0.18, 0.36, 0.16],
  albedoSource: 's2:2026-11-15', albedoDate: '2026-11-15', ndvi, ndviSource: 's2:2026-11-15', ndviDate: '2026-11-15',
  dryness, drynessSource: 'climatology', drynessDate: null, snow: 0, snowSource: 'climatology', snowDate: null,
})

describe('Stage 4 review round 1: face alignment, cover containment, PRNG independence, metre projection & budget', () => {
  it('shares projected-face distance with Stage 3 below the last DEM point (valley floor & occluded far face)', () => {
    const base = buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-02-15T12:00'))
    // 3 km = bare (6), 1.6 km = crop (4); DEM near column ends at y=72 (km=3.0), far ends at y=58 (km=4.0).
    const bands = [
      { distanceM: 1600, elevationM: 0, sample: cell(4, 0.6) },
      { distanceM: 3000, elevationM: 0, sample: cell(6, 0.08, 0.85) },
      { distanceM: 4000, elevationM: 0, sample: cell(6, 0.08, 0.85) },
    ]
    const land: LivingLand = { ...base.land, own: cell(6, 0.08, 0.85), rays: base.land.rays.map((r) => ({ ...r, bands })) }
    const flatPlane = (y: number, km: number) => ({ points: [[0, y], [375, y]] as [number, number][], distanceKm: [km, km] })
    const w: WorldState = {
      ...base, land,
      terrain: {
        ...base.terrain, near: flatPlane(40, 3.0), far: flatPlane(30, 4.0),
        faces: {
          near: { columns: [{ x: 0, crest: 40, points: [{ y: 72, km: 3.0, h: 0, slope: 0.04 }] }, { x: 375, crest: 40, points: [{ y: 72, km: 3.0, h: 0, slope: 0.04 }] }], contours: [] },
          far: { columns: [{ x: 0, crest: 30, points: [{ y: 58, km: 4.0, h: 0, slope: 0.05 }] }, { x: 375, crest: 30, points: [{ y: 58, km: 4.0, h: 0, slope: 0.05 }] }], contours: [] },
        },
      },
    }
    expect(faceAtY(w, 'near', w.terrain.near, 180, 40, 128, 118).km).toBeCloseTo(3.0, 5)
    expect(faceAtY(w, 'far', w.terrain.far, 180, 30, 68, 66).km).toBeCloseTo(4.0, 5)
    const surf = planeSurfaceOf(w, 'near', w.terrain.near, 128)
    const veg = planeVegetationOf(w, BOX, 'near', w.terrain.near, surf.median, [])
    expect(veg.fields.length).toBe(0) // stays on 3 km bare ground; never extrapolates to 1.6 km crop
    expect(veg.strata.length).toBeGreaterThan(0)
  })

  it('keeps parcels inside a crop ray and splits marks around an overlay', () => {
    const clear = [{ x: 60, y: 76, w: 70, h: 6 }]
    const neighbours = [{ x: 0, y: 50, w: 88, h: 78, cover: 6 }, { x: 102, y: 50, w: 273, h: 78, cover: 8 }]
    const b1 = emptyBuf()
    addFieldParcel(b1, flatEnv(4, 12, [], neighbours), () => 0.5, 95, 65, 95, 18, 12, 0.55, 0.3)
    expect(b1.fields.length).toBeGreaterThan(0)
    for (let i = 0; i < b1.fields.length; i += 9) {
      for (let k = 0; k < 8; k += 2) expect(b1.fields[i + k]).toBeGreaterThanOrEqual(88)
      for (let k = 0; k < 8; k += 2) expect(b1.fields[i + k]).toBeLessThanOrEqual(102)
    }
    const b2 = emptyBuf()
    addFieldParcel(b2, flatEnv(4, 12, clear), () => 0.5, 95, 65, 95, 14, 12, 0.55, 0.3)
    addOrchardBlock(b2, flatEnv(1, 2, clear), () => 0.5, 95, 65, 95, 24, 2, 'palm', 0.8)
    expect(b2.fields.length).toBe(18)
    expect(b2.fields[5]).toBeLessThan(clear[0].y)
    expect(b2.fields[10]).toBeGreaterThan(clear[0].y + clear[0].h)
    expect(b2.rows.length).toBeGreaterThan(0)
    for (let i = 0; i < b2.rows.length; i += 6) expect(b2.rows[i + 3] < 76 || b2.rows[i + 1] > 82).toBe(true)
  })

  it('projects orchard spacing from metres (resolved rows vs subpixel alleys) and classifies fields from unjittered NDVI', () => {
    const nearBuf = emptyBuf(), midBuf = emptyBuf()
    addOrchardBlock(nearBuf, flatEnv(1, 2), seeded(11), 180, 65, 110, 24, 2, 'palm', 0.9)
    addOrchardBlock(midBuf, flatEnv(1, 12), seeded(11), 180, 65, 110, 24, 12, 'palm', 0.9)
    expect(nearBuf.rows.length / 6).toBeGreaterThanOrEqual(4)
    const nearDx = Math.abs(nearBuf.rows[8] - nearBuf.rows[2])
    const midDx = Math.abs(midBuf.rows[8] - midBuf.rows[2])
    expect(nearDx).toBeCloseTo(4.0, 1) // 8 m / 2 m/px
    expect(midDx).toBeCloseTo(3.0, 1)  // 36 m alley / 12 m/px (NOT 73 m fake rows)
    expect(nearBuf.treeMeta[2]).toBeGreaterThan(midBuf.treeMeta[2]) // higher visibility close up

    // Exact unjittered NDVI threshold (0.34): 0.33 never growing, 0.35 always growing across 20 seeds.
    for (let s = 1; s <= 20; s++) {
      const lo = emptyBuf(), hi = emptyBuf()
      addFieldParcel(lo, flatEnv(4, 15), seeded(s), 180, 65, 100, 14, 15, 0.33, 0.75)
      addFieldParcel(hi, flatEnv(4, 15), seeded(s), 180, 65, 100, 14, 15, 0.35, 0.75)
      expect(lo.fieldMeta[0]).not.toBe(0)
      expect(hi.fieldMeta[0]).toBe(0)
    }
  })

  it('keeps unchanged cells bit-for-bit stable across data updates, enforces < 10 KB budget, and caches groundForm on scrub', () => {
    const base = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-02-15T12:00'))
    const mkWorld = (leftCover: number): WorldState => {
      const rays = base.land.rays.map((r, i) => ({
        ...r,
        bands: r.bands.map((b) => ({ ...b, sample: i < base.land.rays.length / 2 ? cell(leftCover, 0.65) : cell(1, 0.65) })),
      }))
      return { ...base, land: { ...base.land, rays } }
    }
    const vegA = planeVegetationOf(mkWorld(6), BOX, 'near', base.terrain.near, [0.2, 0.25, 0.18], [])
    const vegB = planeVegetationOf(mkWorld(4), BOX, 'near', base.terrain.near, [0.2, 0.25, 0.18], [])
    const rightTrees = (v: typeof vegA) => {
      const out: number[] = []
      for (let i = 0; i < v.trees.length; i += 6) if (v.trees[i] > 220) out.push(...v.trees.slice(i, i + 6))
      return out
    }
    expect(rightTrees(vegA).length).toBeGreaterThan(0)
    expect(rightTrees(vegA)).toEqual(rightTrees(vegB))

    // Dense synthetic mixed near plane stays strictly under 10,000 bytes; zero unused fields.
    const mixedRays = base.land.rays.map((r, i) => {
      const cov = [1, 4, 2, 3, 6][i % 5]
      return { ...r, bands: r.bands.map((b) => ({ ...b, sample: cell(cov, 0.68, 0.3) })) }
    })
    const mixedVeg = planeVegetationOf({ ...base, land: { ...base.land, rays: mixedRays } }, BOX, 'near', base.terrain.near, [0.2, 0.25, 0.18], [])
    expect(Object.values(mixedVeg).reduce((sum, v) => sum + (ArrayBuffer.isView(v) ? v.byteLength : 0), 0)).toBeLessThan(10_000)
    expect('horizonY' in mixedVeg).toBe(false)
    expect('albedo' in sampleVegAtKm(base.land, 10, 1.5)).toBe(false)
    expect(sampleCoverAtKm(base.land, 10, 1.5)).toBe(sampleVegAtKm(base.land, 10, 1.5).cover)

    // groundForm is memoised across same-day hour scrubs.
    const build = makeWorldBuilder()
    const in0 = worldInput(loaded.get('rosh-pina')!, '2026-02-15T08:00')
    const w1 = build({ ...in0, selected: '2026-02-15T08:00' })
    const w2 = build({ ...in0, selected: '2026-02-15T15:00' })
    expect(groundForm(w1, BOX, 'near', [])).toBe(groundForm(w2, BOX, 'near', []))
  })
})
