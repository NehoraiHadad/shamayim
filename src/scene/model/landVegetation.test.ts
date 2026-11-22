import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { SCENE_CAMERA } from '../../domain/camera'
import type { LocalTime } from '../../domain/types'
import { makeNear, makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintPlaneLight } from '../paint/planeLight'
import { layersOn, sceneModel } from '.'
import { labOf } from './tone'
import type { LayerOf, SceneBox } from './types'
import {
  classifyVegCell, cropFieldState, distanceFade, FIELD_MAX_M_PER_PX, mPerPxAt,
  ORCHARD_FULL_M_PER_PX, ORCHARD_MAX_M_PER_PX, SCRUB_MAX_M_PER_PX,
  solarMonthOf, STRATA_MAX_M_PER_PX, TREE_KIND_CODE, TREE_MAX_M_PER_PX,
} from './vegRules'
import { buildVegPalette, TONE } from './vegSample'
import { addOrchardBlock } from './vegOrchard'
import { emptyBuf, flatEnv } from './vegBuilderFixtures.testkit'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces() })
afterAll(() => { vi.unstubAllGlobals() })

const nearPlane = (w: WorldState) =>
  layersOn(sceneModel(w, BOX), 'land').find((l): l is LayerOf<'plane'> => l.kind === 'plane' && l.plane === 'near')!

describe('Stage 4: vegetation rules, seasonal fields, distance cut & purity', () => {
  it('classifies cover and treats mapped crops as separate evidence from greenness and climate', () => {
    const base = { ndvi: 0.45, dryness: 0.3, koppen: 'M' as const, lat: 32.9, lon: 35.5, elevationM: 400 }
    const expectations = [[1, 'forest'], [2, 'shrub'], [3, 'grass'], [4, 'crop'], [5, 'none'], [6, 'bare'], [8, 'none']] as const
    for (const [cover, type] of expectations) expect(classifyVegCell({ ...base, cover }).veg).toBe(type)
    expect(classifyVegCell({ ...base, cover: 1, ndvi: 0.20 }).density).toBeLessThan(classifyVegCell({ ...base, cover: 1, ndvi: 0.65 }).density)
    const oasis = { ...base, koppen: 'B' as const, lat: 31.8, lon: 35.4, elevationM: -250 }
    expect(classifyVegCell({ ...oasis, cover: 1 }).veg).toBe('forest')
    expect(classifyVegCell({ ...oasis, cover: 4, ndvi: 0.65 }).veg).toBe('crop')
    for (const mappedCrop of ['orchard', 'olive', 'citrus', 'palm'] as const) {
      expect(classifyVegCell({ ...oasis, cover: 1, mappedCrop })).toMatchObject({ veg: 'orchard', orchard: mappedCrop })
    }
    expect(classifyVegCell({ ...oasis, cover: 1, mappedCrop: 'vineyard' })).toMatchObject({ veg: 'crop', orchard: null })
    expect(classifyVegCell({ ...oasis, cover: 3, ndvi: 0.08, dryness: 0.85 }).veg).toBe('bare')
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

    // Grass stays green at semi-arid winter peak (climate-relative onset + NDVI) and shifts to straw-gold in dry summer.
    const winterShadmot = nearPlane(buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-02-15T12:00'))).vegetation
    const winterGrass = winterShadmot.tones[TONE.GRASS]
    const summerGrass = nearPlane(buildWorld(worldInput(loaded.get('shadmot-mehola')!, '2026-08-15T12:00'))).vegetation.tones[TONE.GRASS]
    expect(labOf(winterGrass).a).toBeLessThan(-0.04) // distinctly green in mid-February Jordan Valley (never premature straw)
    expect(labOf(summerGrass).a).toBeGreaterThan(labOf(winterGrass).a + 0.03)
    expect(labOf(summerGrass).l).toBeGreaterThan(labOf(winterGrass).l + 0.04)
    expect(labOf(summerGrass).b).toBeGreaterThan(labOf(winterGrass).b)
    // Sampled high-NDVI grass stays greener than dry low-NDVI grass at the same semi-arid dryness.
    const greenSample = buildVegPalette([0.2, 0.25, 0.18], 0.55, { grassDryness: 0.55, minClimateDry: 0.42, grassNdvi: 0.48 })[TONE.GRASS]
    const drySample = buildVegPalette([0.2, 0.25, 0.18], 0.55, { grassDryness: 0.55, minClimateDry: 0.42, grassNdvi: 0.16 })[TONE.GRASS]
    expect(labOf(greenSample).a).toBeLessThan(labOf(drySample).a - 0.02)

    // Generic untagged `orchard` uses a neutral unknown-species motif, distinct from silvery `olive`.
    expect(TREE_KIND_CODE.orchard).not.toBe(TREE_KIND_CODE.olive)
    const pal = buildVegPalette([0.2, 0.25, 0.18], 0.30)
    const oliveLab = labOf(pal[TONE.OLIVE]), orchardLab = labOf(pal[TONE.ORCHARD])
    expect(Math.hypot(oliveLab.l - orchardLab.l, oliveLab.a - orchardLab.a, oliveLab.b - orchardLab.b)).toBeGreaterThan(0.03)
    const ordBuf = emptyBuf(), olBuf = emptyBuf()
    addOrchardBlock(ordBuf, flatEnv(1, 2), () => 0.4, 180, 65, 110, 24, 2, 'orchard', 0.9)
    addOrchardBlock(olBuf, flatEnv(1, 2), () => 0.4, 180, 65, 110, 24, 2, 'olive', 0.9)
    expect(ordBuf.rowMeta[0]).toBe(TONE.ORCHARD)
    expect(olBuf.rowMeta[0]).toBe(TONE.OLIVE)
    expect(ordBuf.treeMeta[0]).toBe(TREE_KIND_CODE.orchard)
    expect(ordBuf.treeMeta[1]).toBe(TONE.ORCHARD)
    expect(olBuf.treeMeta[0]).toBe(TREE_KIND_CODE.olive)
    // Near-slope scrub/grass tufts are readable at 375 px (radius >= 1.0 px and strong visibility on near slopes).
    expect(winterShadmot.tufts.length).toBeGreaterThan(0)
    const maxTuftR = Math.max(...Array.from({ length: winterShadmot.tufts.length / 4 }, (_, i) => winterShadmot.tufts[i * 4 + 2]))
    const maxTuftA = Math.max(...Array.from({ length: winterShadmot.tufts.length / 4 }, (_, i) => winterShadmot.tufts[i * 4 + 3]))
    expect(maxTuftR).toBeGreaterThanOrEqual(1.1)
    expect(maxTuftA).toBeGreaterThan(0.55)

    // Woodland palette separates dark understory < crown body < ambient light side, and Galilee woodland renders dense varied crowns.
    const roshVeg = nearPlane(buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-02-15T12:00'))).vegetation
    expect(labOf(roshVeg.tones[TONE.PINE_UNDER]).l).toBeLessThan(labOf(roshVeg.tones[TONE.PINE_MID]).l - 0.08)
    expect(labOf(roshVeg.tones[TONE.PINE_LIT]).l).toBeGreaterThan(labOf(roshVeg.tones[TONE.PINE_MID]).l + 0.08)
    const roshRadii = Array.from({ length: roshVeg.trees.length / 6 }, (_, i) => roshVeg.trees[i * 6 + 2])
    expect(roshRadii.length).toBeGreaterThanOrEqual(30) // cohesive clusters, not a handful of sparse dots
    expect(Math.max(...roshRadii) / Math.min(...roshRadii)).toBeGreaterThan(1.8) // varied emergent/mid/edge crown tiers

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
    expect(() => { paintPlaneLight(fakeCtx(), planes[1], env) }).not.toThrow()
  })
})
