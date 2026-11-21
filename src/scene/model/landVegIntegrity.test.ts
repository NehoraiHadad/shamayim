import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { seeded } from '../../data/landmarks/hash'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LivingLand, LivingLandSample } from '../../world/landLiving'
import type { WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { faceAtY } from './faceProjection'
import { groundForm } from './ground'
import { planeSurfaceOf } from './landColour'
import { planeVegetationOf, vegByteLength } from './landVegetation'
import type { Box, SceneBox } from './types'
import { addFieldParcel, addOrchardBlock } from './vegAgriBuilders'
import type { BuildEnv, VegBuffers } from './vegBuilders'
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

const emptyBuf = (): VegBuffers => ({
  trees: [], treeMeta: [], fields: [], fieldMeta: [], rows: [], rowMeta: [], tufts: [], tuftMeta: [], strata: [], strataMeta: [],
})

const flatEnv = (coverAt: BuildEnv['coverAt'], clear: readonly Box[] = []): BuildEnv => ({
  sx: 1, width: 375, landHeight: 128, horizonY: 40, koppen: 'M', solarMonth: 6,
  crestAt: () => 50, footAt: () => 128, coverAt,
  blocked: (x, y, r) => clear.some((b) => x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h),
  blockedBox: (x0, y0, x1, y1) => clear.some((b) => x1 > b.x && x0 < b.x + b.w && y1 > b.y && y0 < b.y + b.h),
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

  it('keeps field quads, orchard rows and trees strictly inside compatible cover and outside clear zones', () => {
    const clear: Box[] = [{ x: 85, y: 70, w: 30, h: 25 }]
    // Isolated crop strip at x in [88..102] flanked by bare (6) on the left and water (8) on the right.
    const cropStrip: BuildEnv['coverAt'] = (x) => (x >= 88 && x <= 102 ? 4 : x < 88 ? 6 : 8)
    const b1 = emptyBuf()
    addFieldParcel(b1, flatEnv(cropStrip), seeded(7), 95, 65, 95, 18, 12, 0.55, 0.3)
    for (let i = 0; i < b1.fields.length; i += 9) {
      for (let k = 0; k < 8; k += 2) expect(cropStrip(b1.fields[i + k], b1.fields[i + k + 1])).toBe(4)
    }
    // Field and orchard crossing a clear zone are rejected.
    const b2 = emptyBuf()
    addFieldParcel(b2, flatEnv(() => 4, clear), seeded(7), 95, 65, 95, 14, 12, 0.55, 0.3)
    expect(b2.fields.length).toBe(0)
    addOrchardBlock(b2, flatEnv(() => 1, clear), seeded(7), 95, 65, 95, 24, 5, 'palm', 0.8)
    expect(b2.rows.length).toBe(0)
    expect(b2.trees.length).toBe(0)
  })

  it('projects orchard spacing from metres (resolved rows vs subpixel alleys) and classifies fields from unjittered NDVI', () => {
    const nearBuf = emptyBuf(), midBuf = emptyBuf()
    // 8 m palm rows: at 4 m/px -> rowPx = 2.0 px (resolved); at 12 m/px -> subpixel, switches to 36 m alley pitch = 3.0 px.
    addOrchardBlock(nearBuf, flatEnv(() => 1), seeded(11), 180, 65, 110, 24, 4, 'palm', 0.9)
    addOrchardBlock(midBuf, flatEnv(() => 1), seeded(11), 180, 65, 110, 24, 12, 'palm', 0.9)
    expect(nearBuf.rows.length / 6).toBeGreaterThanOrEqual(4)
    const nearDx = Math.abs(nearBuf.rows[8] - nearBuf.rows[2])
    const midDx = Math.abs(midBuf.rows[8] - midBuf.rows[2])
    expect(nearDx).toBeCloseTo(2.0, 1) // 8 m / 4 m/px
    expect(midDx).toBeCloseTo(3.0, 1)  // 36 m alley / 12 m/px (NOT 73 m fake rows)
    expect(nearBuf.treeMeta[2]).toBeGreaterThan(midBuf.treeMeta[2]) // higher visibility close up

    // Exact unjittered NDVI threshold (0.34): 0.33 never growing, 0.35 always growing across 20 seeds.
    for (let s = 1; s <= 20; s++) {
      const lo = emptyBuf(), hi = emptyBuf()
      addFieldParcel(lo, flatEnv(() => 4), seeded(s), 180, 65, 100, 14, 15, 0.33, 0.75)
      addFieldParcel(hi, flatEnv(() => 4), seeded(s), 180, 65, 100, 14, 15, 0.35, 0.75)
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
    expect(vegByteLength(mixedVeg)).toBeLessThan(10_000)
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
