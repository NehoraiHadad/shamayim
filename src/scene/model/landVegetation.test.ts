import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import type { LocalTime } from '../../domain/types'
import { makeNear, makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintPlaneLight } from '../paint/planeLight'
import { paintPlane } from '../paint/planes'
import { layersOn, sceneModel } from '.'
import { labOf } from './tone'
import type { LayerOf, SceneBox } from './types'
import {
  classifyVegCell, cropFieldState, distanceFade, FIELD_MAX_M_PER_PX, mPerPxAt,
  ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX, orchardKindOf, SCRUB_MAX_M_PER_PX,
  solarMonthOf, STRATA_MAX_M_PER_PX, TREE_MAX_M_PER_PX,
} from './vegRules'
import { TONE } from './vegSample'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces() })
afterAll(() => { vi.unstubAllGlobals() })

const nearPlane = (w: WorldState) =>
  layersOn(sceneModel(w, BOX), 'land').find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!

describe('Stage 4: vegetation rules, seasonal fields, distance cut & purity', () => {
  it('maps WorldCover + Köppen + elevation to forest, orchards (olive/citrus/palm), crops, scrub/grass and bare strata', () => {
    // Arid / hot rift semi-arid irrigated tree/crop -> date palms
    expect(orchardKindOf('B', 31.8, 35.4, -250, 1, 0.03, 0.42)).toBe('palm')
    expect(orchardKindOf('M', 32.5, 35.5, -121, 1, 0.04, 0.45)).toBe('palm')
    // Frost-free lowland Mediterranean gentle slope -> citrus; upland Mediterranean hills -> olive
    expect(orchardKindOf('M', 32.1, 34.8, 40, 1, 0.03, 0.45)).toBe('citrus')
    expect(orchardKindOf('M', 31.8, 35.2, 650, 1, 0.09, 0.40)).toBe('olive')
    // Cold temperate / alpine -> no Mediterranean/subtropical orchards
    expect(orchardKindOf('C', 51.5, 0.0, 50, 1, 0.03, 0.55)).toBeNull()
    expect(orchardKindOf('E', 46.5, 8.0, 2400, 1, 0.03, 0.40)).toBeNull()
    // Non-tree/crop or steep slope -> never orchard
    expect(orchardKindOf('M', 32.1, 34.8, 40, 6, 0.03, 0.45)).toBeNull()
    expect(orchardKindOf('M', 32.1, 34.8, 40, 1, 0.35, 0.45)).toBeNull()

    // Cover -> vegetation class rules
    const base = { ndvi: 0.45, dryness: 0.3, slope: 0.16, koppen: 'M' as const, lat: 32.9, lon: 35.5, elevationM: 400, mPerPx: 10, cellHash: 0.8 }
    expect(classifyVegCell({ ...base, cover: 1 }).veg).toBe('forest')
    expect(classifyVegCell({ ...base, cover: 1, ndvi: 0.20 }).density).toBeLessThan(classifyVegCell({ ...base, cover: 1, ndvi: 0.65 }).density)
    expect(classifyVegCell({ ...base, cover: 1, slope: 0.04, nearCrop: true }).veg).toBe('orchard')
    expect(classifyVegCell({ ...base, cover: 1, slope: 0.04, nearCrop: true, mPerPx: ORCHARD_MAX_M_PER_PX + 1 }).veg).toBe('forest')
    expect(classifyVegCell({ ...base, cover: 4 }).veg).toBe('crop')
    expect(classifyVegCell({ ...base, cover: 2 }).veg).toBe('shrub')
    expect(classifyVegCell({ ...base, cover: 3 }).veg).toBe('grass')
    expect(classifyVegCell({ ...base, cover: 6 }).veg).toBe('bare')
    expect(classifyVegCell({ ...base, cover: 8 }).veg).toBe('none')
    expect(classifyVegCell({ ...base, cover: 5 }).veg).toBe('none')
    // Arid desert screen forces low-NDVI dry cells to bare even if cover is shrub/grass
    expect(classifyVegCell({ ...base, koppen: 'B', lat: 30.6, lon: 34.8, cover: 3, ndvi: 0.08, dryness: 0.85 }).veg).toBe('bare')
  })

  it('derives cropland field state (growing / ploughed / straw) from NDVI, dryness and hemisphere-aware season', () => {
    expect(cropFieldState(0.55, 0.25, 2, 'M')).toBe('growing')
    expect(cropFieldState(0.18, 0.60, 11, 'M')).toBe('ploughed') // Mediterranean autumn sowing season
    expect(cropFieldState(0.18, 0.30, 6, 'M')).toBe('ploughed')  // Moist tilled bare soil
    expect(cropFieldState(0.18, 0.82, 8, 'M')).toBe('straw')     // Dry post-harvest summer stubble
    expect(cropFieldState(0.18, 0.72, 4, 'C')).toBe('ploughed')  // Cold temperate spring sowing
    expect(cropFieldState(0.18, 0.72, 8, 'C')).toBe('straw')     // Temperate late-summer harvest
    // Southern Hemisphere season inversion (July = solar winter month 1, Jan = solar summer month 7)
    expect(solarMonthOf(7, -33.9)).toBe(1)
    expect(solarMonthOf(1, -33.9)).toBe(7)
    expect(cropFieldState(0.18, 0.80, solarMonthOf(1, -33.9), 'M')).toBe('straw')
    expect(cropFieldState(0.18, 0.65, solarMonthOf(7, -33.9), 'M')).toBe('ploughed')
  })

  it('applies exact metres-per-pixel resolvability cuts and monotonic distance fade', () => {
    const mAt1km = mPerPxAt(1000, SCENE_CAMERA)
    expect(mAt1km).toBeCloseTo((1000 * Math.PI) / (180 * 1.5), 4)
    expect(distanceFade(ORCHARD_FULL_M_PER_PX, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)).toBe(1)
    expect(distanceFade(ORCHARD_MAX_M_PER_PX, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)).toBe(0)
    expect(distanceFade(19, ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX)).toBeCloseTo(0.5, 4)
    // Thresholds increase with feature scale: orchards < scrub < trees < fields < strata
    expect(ORCHARD_MAX_M_PER_PX).toBeLessThan(SCRUB_MAX_M_PER_PX)
    expect(SCRUB_MAX_M_PER_PX).toBeLessThan(TREE_MAX_M_PER_PX)
    expect(TREE_MAX_M_PER_PX).toBeLessThan(FIELD_MAX_M_PER_PX)
    expect(FIELD_MAX_M_PER_PX).toBeLessThan(STRATA_MAX_M_PER_PX)

    // Distant far plane (> 10 km) drops orchards, trees and tufts to avoid sub-pixel aliasing
    const w = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-02-15T12:00'))
    const far = layersOn(sceneModel(w, BOX), 'land').find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'far')!
    expect(far.vegetation.rows.length).toBe(0)
    expect(far.vegetation.trees.length).toBe(0)
  })

  it('draws zero vegetation on bare desert (strata only), straw-gold grass when dry, and dense vs broken forest by NDVI', () => {
    const negev = nearPlane(buildWorld(worldInput(loaded.get('ramon-crater')!, '2026-08-15T12:00')))
    expect(negev.vegetation.trees.length).toBe(0)
    expect(negev.vegetation.fields.length).toBe(0)
    expect(negev.vegetation.rows.length).toBe(0)
    expect(negev.vegetation.tufts.length).toBe(0)
    expect(negev.vegetation.strata.length).toBeGreaterThan(0)
    expect(negev.terraces.length).toBe(0)

    // Grass shifts from green-olive in winter to warm straw-gold (higher L & yellow +b) in dry summer
    const winterGrass = nearPlane(buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-02-15T12:00'))).vegetation.tones[TONE.GRASS]
    const summerGrass = nearPlane(buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-08-15T12:00'))).vegetation.tones[TONE.GRASS]
    expect(labOf(summerGrass).l).toBeGreaterThan(labOf(winterGrass).l + 0.04)
    expect(labOf(summerGrass).b).toBeGreaterThan(labOf(winterGrass).b)

    // Forest cover (10) produces clustered trees with high NDVI and fewer/sparser trees when NDVI is low
    const highForest = nearPlane(buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', {
      cover: typedCover(1, 'worldcover-2021:local-50m'), near: makeNear({ date: '2026-11-15', ndvi: 0.72 }), far: null, weather: null,
    })))
    const lowForest = nearPlane(buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', {
      cover: typedCover(1, 'worldcover-2021:local-50m'), near: makeNear({ date: '2026-11-15', ndvi: 0.16 }), far: null, weather: null,
    })))
    expect(highForest.vegetation.trees.length).toBeGreaterThan(lowForest.vegetation.trees.length)
  })

  it('has zero place-name dependence, keeps form key independent of hour, stays compact/cloneable, and prepares Stage 5 tree phase/height', () => {
    const lp = loaded.get('rosh-pina')!
    const wA = buildWorld(worldInput(lp, '2026-02-15T12:00'))
    const renamed = { ...lp, place: { ...lp.place, id: 'anonymous-site', nameHe: 'מקום אחר', regionHe: 'אזור אחר' } }
    const wB = buildWorld(worldInput(renamed, '2026-02-15T12:00'))
    const vegA = nearPlane(wA).vegetation, vegB = nearPlane(wB).vegetation
    expect(vegA).toEqual(vegB)

    // Structured-cloneable, compact (< 10 KB typed arrays), Stage 5 wind-ready (height > 0, phase in [0, 2π))
    expect(structuredClone(vegA)).toEqual(vegA)
    const bytes = vegA.trees.byteLength + vegA.treeMeta.byteLength + vegA.fields.byteLength + vegA.fieldMeta.byteLength
      + vegA.rows.byteLength + vegA.rowMeta.byteLength + vegA.tufts.byteLength + vegA.tuftMeta.byteLength
      + vegA.strata.byteLength + vegA.strataMeta.byteLength
    expect(bytes).toBeLessThan(10_000)
    expect(vegA.trees.length).toBeGreaterThan(0)
    for (let i = 0; i < vegA.trees.length; i += 6) {
      expect(vegA.trees[i + 3]).toBeGreaterThan(0) // height
      expect(vegA.trees[i + 4]).toBeGreaterThanOrEqual(0) // phase
      expect(vegA.trees[i + 4]).toBeLessThan(Math.PI * 2 + 1e-5)
    }

    // Form key independent of hour on scrub; repaints on date change; paints Worker-safely
    const build = makeWorldBuilder()
    const baseIn = worldInput(lp, '2026-02-15T06:00')
    const hours: LocalTime[] = ['2026-02-15T06:00', '2026-02-15T12:00', '2026-02-15T16:30', '2026-02-15T21:00']
    const planes = hours.map((at) => nearPlane(build({ ...baseIn, selected: at })))
    for (const p of planes.slice(1)) {
      expect(p.key).toBe(planes[0].key)
      expect(p.vegetation).toBe(planes[0].vegetation) // memoised across hour scrubs
    }
    expect(new Set(planes.map((p) => p.light.key)).size).toBe(hours.length)
    expect(nearPlane(build({ ...baseIn, selected: '2026-08-15T12:00' })).key).not.toBe(planes[1].key)

    const fakeCtx = (): Ctx2D => new Proxy({}, {
      get: (_, prop) => prop === 'createImageData'
        ? (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
        : prop === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
      set: () => true,
    }) as unknown as Ctx2D
    const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: fakeCtx() }) }
    expect(() => { paintPlane(fakeCtx(), planes[1], env); paintPlaneLight(fakeCtx(), planes[1], env) }).not.toThrow()
  })
})
