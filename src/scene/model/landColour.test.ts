import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { deltaE } from '../../theme/oklab'
import { fullLandData, makeFar, makeNear, makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LivingLand, LivingLandSample } from '../../world/landLiving'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintPlaneLight } from '../paint/planeLight'
import { layersOn, sceneModel } from '.'
import { quantiseTones } from './landColour'
import { COVER_WATER, sampleBandAtKm } from './landPalette'
import { albedoLinear, FLAT_NORMAL, linearRgbToSrgb, litLandRgb } from './landRadiance'
import { hazeAt, hazeOf, toneAt } from './landVeil'
import { hexOf, labOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => { stubPublicFetch(); loaded = await loadPlaces() })
afterAll(() => { vi.unstubAllGlobals() })

const planesOf = (w: WorldState) => layersOn(sceneModel(w, BOX), 'land').filter((l): l is LayerOf<'plane'> => l.kind === 'plane')
const sample = (albedo: RGB, source: LivingLandSample['albedoSource'], cover: number | null = 4): LivingLandSample => ({
  cover, coverSource: 'worldcover-2021:local-50m', albedo, albedoSource: source, albedoDate: null,
  ndvi: 0.3, ndviSource: 'climatology', ndviDate: null, dryness: 0.4, drynessSource: 'climatology', drynessDate: null,
  snow: 0, snowSource: 'climatology', snowDate: null,
})

describe('Stage 3: living-land albedo, bounds, water exclusion, wetness & form/light split', () => {
  it('preserves raw BOA sRGB albedo without lightness squeeze, quantises deterministically and preserves band bounds/sources', () => {
    const pine = linearRgbToSrgb(albedoLinear([0.28, 0.33, 0.25])), desert = linearRgbToSrgb(albedoLinear([0.48, 0.46, 0.42]))
    expect(labOf(desert).l).toBeGreaterThan(labOf(pine).l + 0.1)
    expect(labOf(pine).a).toBeLessThan(labOf(desert).a)
    expect(quantiseTones([pine, pine, pine], 6).palette).toHaveLength(1)

    const nearRgb: RGB = [0.22, 0.45, 0.20], midRgb: RGB = [0.45, 0.42, 0.30], farRgb: RGB = [0.62, 0.54, 0.40]
    const makeLand = (bands: { distanceM: number; sample: LivingLandSample }[], own = sample([0.18, 0.36, 0.16], 's2:2026-11-16'),
      localPts = [{ eastM: 0, northM: 0, elevationM: 0, sample: own }]): LivingLand => ({
      date: '2026-11-17', utcDate: '2026-11-17', month: 11, distancesM: bands.map((b) => b.distanceM),
      rays: [{ x: 187.5, azimuth: 180, bands: bands.map((b) => ({ ...b, elevationM: 0 })) }],
      own, local: localPts, farGain: { rgb: [0.25, 0.25, 0.25], source: 'assumed-tci', cells: 0 },
    })
    const land = makeLand([
      { distanceM: 500, sample: sample(nearRgb, 's2:2026-11-15') },
      { distanceM: 2000, sample: sample(midRgb, 's2-mean:2026-11-10') },
      { distanceM: 55_000, sample: sample(farRgb, 'gibs:2026-11-01') },
    ])
    // Above outer band (60 > 55 km) stays on outer GIBS band; below 0.5 km centre weight (0.55) dominates source
    expect(sampleBandAtKm(land, 0, 60)).toEqual({ albedo: farRgb, source: 'gibs:2026-11-01' })
    expect(sampleBandAtKm(land, 0, 55)).toEqual({ albedo: farRgb, source: 'gibs:2026-11-01' })
    expect(sampleBandAtKm(land, 0, 2)).toEqual({ albedo: midRgb, source: 's2-mean:2026-11-10' })
    expect(sampleBandAtKm(land, 0, 0.35).source).toBe('s2:2026-11-16')
    expect(sampleBandAtKm(land, 0, 0.55).source).toBe('s2:2026-11-15')
    // Beyond last dry band when outer band is water -> clamp to 2 km dry band
    const outerWater = makeLand([
      { distanceM: 500, sample: sample(nearRgb, 's2:2026-11-15') },
      { distanceM: 2000, sample: sample(midRgb, 's2-mean:2026-11-10') },
      { distanceM: 55_000, sample: sample([0.1, 0.2, 0.6], 'gibs:2026-11-01', COVER_WATER) },
    ])
    expect(sampleBandAtKm(outerWater, 0, 30)).toEqual({ albedo: midRgb, source: 's2-mean:2026-11-10' })
    // All rays water + water centre -> non-water local sample; all local water too -> explicit land climatology
    const waterOwn = sample([0.1, 0.2, 0.6], 's2:2026-11-15', COVER_WATER), dryLocal = sample([0.28, 0.40, 0.22], 's2:2026-11-12', 4)
    expect(sampleBandAtKm(makeLand([{ distanceM: 500, sample: waterOwn }], waterOwn, [
      { eastM: 0, northM: 0, elevationM: 0, sample: waterOwn }, { eastM: 1500, northM: 0, elevationM: 0, sample: dryLocal },
    ]), 0, 1)).toEqual({ albedo: dryLocal.albedo, source: 's2:2026-11-12' })
    const climFallback = sampleBandAtKm(makeLand([{ distanceM: 500, sample: waterOwn }], waterOwn), 0, 1)
    expect(climFallback.source).toBe('climatology')
    expect(climFallback.albedo[2]).toBeLessThan(Math.max(climFallback.albedo[0], climFallback.albedo[1]))
  })

  it('keeps plane descriptions compact, structured-cloneable, water-excluded and spatially varying', () => {
    const data = fullLandData()
    const near = data.near!
    for (let r = 0; r < near.size; r++) for (let c = 0; c < near.size; c++) {
      near.rgb.set(c < near.size / 2 ? [62, 118, 56] : [206, 178, 134], (r * near.size + c) * 3)
    }
    const w = buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', data))
    const nearPlane = planesOf(w).find((p) => p.plane === 'near')!
    const farPlane = planesOf(w).find((p) => p.plane === 'far')!
    expect(nearPlane.surfaceTone.palette.length).toBeGreaterThanOrEqual(2)
    expect(nearPlane.surfaceTone.palette.length).toBeLessThanOrEqual(6)
    expect(JSON.stringify(nearPlane.surfaceTone).length).toBeLessThan(1200)
    expect(structuredClone(nearPlane.surfaceTone)).toEqual(nearPlane.surfaceTone)
    expect(nearPlane.surfaceTone.source).toMatch(/^s2:2026-11-15/)
    expect(farPlane.surfaceTone.source).toMatch(/^gibs:2026-11-01/)

    const coastalCover = { coverAt: (_lat: number, lon: number) => (lon < SHADMOT.lon ? 8 : 4) }
    const wCoast = buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', { cover: coastalCover, near: null, far: null, weather: null }))
    for (const c of planesOf(wCoast).find((p) => p.plane === 'near')!.surfaceTone.palette) {
      expect(c[2]).toBeLessThanOrEqual(Math.max(c[0], c[1]) + 0.03)
    }
  })

  it('fades monotonically with distance, darkens both dark & bright tones monotonically with wetness, and separates seasons', () => {
    const winterGalilee = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-02-15T12:00'))
    const summerGalilee = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-08-15T12:00'))
    const negev = buildWorld(worldInput(loaded.get('ramon-crater')!, '2026-08-15T12:00'))
    const galW = planesOf(winterGalilee).find((p) => p.plane === 'near')!
    const galS = planesOf(summerGalilee).find((p) => p.plane === 'near')!
    const neg = planesOf(negev).find((p) => p.plane === 'near')!
    expect(labOf(galW.fill).a).toBeLessThan(labOf(galS.fill).a)
    expect(labOf(neg.fill).l).toBeGreaterThan(labOf(galW.fill).l)

    const hazeRgb = hazeOf(negev), haze = hexOf(hazeRgb)
    const gaps = [0.5, 2, 10, 35].map((km) => deltaE(hexOf(toneAt(negev, km, hazeRgb)), haze))
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1] + 1e-3)
    expect(gaps.at(-1)!).toBeLessThan(gaps[0])

    // Wetness monotonicity over BOTH dark pine and bright desert BOA albedos in linear light (`×(1 - 0.45*wet)`)
    const darkAlbedo: RGB = [0.24, 0.32, 0.22], brightAlbedo: RGB = [0.50, 0.47, 0.41]
    for (const albedo of [darkAlbedo, brightAlbedo]) {
      let prev = Infinity
      for (const wet of [0, 0.25, 0.5, 0.75, 1]) {
        const l = labOf(litLandRgb({ ...negev, ground: { ...negev.ground, wet } }, albedo, FLAT_NORMAL, hazeAt(negev, 0))).l
        expect(l).toBeLessThan(prev)
        prev = l
      }
    }
    const negevNight = buildWorld(worldInput(loaded.get('ramon-crater')!, '2026-08-15T21:00'))
    expect(labOf(toneAt(negevNight, 1)).l).toBeLessThan(0.22)
  })

  it('preserves form/light split on scrub, invalidates form on date/data arrival, and paints worker-safely', () => {
    const build = makeWorldBuilder()
    const base = makeWorldInput(SHADMOT, '2026-11-17T06:00', { cover: typedCover(4, 'worldcover-2021:local-50m'), near: null, far: null, weather: null })
    const hours: LocalTime[] = ['2026-11-17T06:00', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
    const models = hours.map((at) => planesOf(build({ ...base, selected: at })))
    for (const m of models.slice(1)) expect(m.map((p) => p.key)).toEqual(models[0].map((p) => p.key))
    expect(new Set(models.map((m) => m.map((p) => p.light.key).join('|'))).size).toBe(hours.length)
    expect(planesOf(build({ ...base, selected: '2026-08-15T12:00' })).map((p) => p.key)).not.toEqual(models[1].map((p) => p.key))
    const observed = planesOf(build({
      ...base, selected: '2026-11-17T12:00',
      land: { cover: typedCover(4, 'worldcover-2021:local-50m'), near: makeNear({ date: '2026-11-15', rgb: [60, 120, 52] }), far: makeFar(), weather: null },
    }))
    expect(observed.map((p) => p.key)).not.toEqual(models[1].map((p) => p.key))

    const fakeCtx = (): Ctx2D => new Proxy({}, {
      get: (_, prop) => prop === 'createImageData'
        ? (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
        : prop === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
      set: () => true,
    }) as unknown as Ctx2D
    const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: fakeCtx() }) }
    expect(() => { paintPlaneLight(fakeCtx(), observed[1], env) }).not.toThrow()
  })
})
