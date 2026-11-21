import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LocalTime } from '../../domain/types'
import { deltaE } from '../../theme/oklab'
import { fullLandData, makeFar, makeNear, makeWorldInput, SHADMOT, typedCover } from '../../test/livingLandFixtures'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld, makeWorldBuilder } from '../../world/world'
import { HAND, type Ctx2D, type PaintEnv } from '../paint/hand'
import { paintPlane, paintPlaneLight } from '../paint/planes'
import { layersOn, sceneModel } from '.'
import { albedoToLandTone, quantiseTones } from './landColour'
import { applyVeil, hazeOf, moodVeilOf, toneAt, veilAt } from './planeLight'
import { hexOf, labOf } from './tone'
import type { LayerOf, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces()
})
afterAll(() => { vi.unstubAllGlobals() })

const planesOf = (w: ReturnType<typeof buildWorld>) =>
  layersOn(sceneModel(w, BOX), 'land').filter((l): l is LayerOf<'plane'> => l.kind === 'plane')

describe('Stage 3: living-land albedo -> quantised plane tones, distance fade, fallback & form/light keys', () => {
  it('maps BOA sRGB albedo to calibrated light-free tones and quantises deterministically to a compact palette', () => {
    const pine = albedoToLandTone([0.28, 0.33, 0.25])
    const desert = albedoToLandTone([0.48, 0.46, 0.42])
    expect(labOf(pine).l).toBeGreaterThanOrEqual(0.22)
    expect(labOf(desert).l).toBeLessThanOrEqual(0.375)
    expect(labOf(desert).l).toBeGreaterThan(labOf(pine).l)
    expect(labOf(pine).a).toBeLessThan(labOf(desert).a) // pine greener, desert warmer

    // Uniform samples collapse to 1 palette entry; diverse samples cap at maxColours
    expect(quantiseTones([pine, pine, pine, pine], 6).palette).toHaveLength(1)
    const varied = [pine, desert, albedoToLandTone([0.33, 0.39, 0.29]), albedoToLandTone([0.46, 0.44, 0.37]),
      albedoToLandTone([0.44, 0.43, 0.42]), albedoToLandTone([0.38, 0.35, 0.28]), albedoToLandTone([0.30, 0.36, 0.32])]
    const q = quantiseTones(varied, 5)
    expect(q.palette.length).toBeGreaterThanOrEqual(2)
    expect(q.palette.length).toBeLessThanOrEqual(5)
    expect(quantiseTones(varied, 5)).toEqual(q)
  })

  it('keeps plane descriptions compact, structured-cloneable, water-excluded and spatially varying by column/band', () => {
    const data = fullLandData()
    // Make west half of near S2 green and east half warm sand; mark local centre as water to verify exclusion
    const near = data.near!
    for (let r = 0; r < near.size; r++) {
      for (let c = 0; c < near.size; c++) {
        near.rgb.set(c < near.size / 2 ? [62, 118, 56] : [206, 178, 134], (r * near.size + c) * 3)
      }
    }
    const w = buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', data))
    const nearPlane = planesOf(w).find((p) => p.plane === 'near')!
    const farPlane = planesOf(w).find((p) => p.plane === 'far')!
    expect(nearPlane.surfaceTone).toBeDefined()
    expect(nearPlane.surfaceTone!.palette.length).toBeGreaterThanOrEqual(2)
    expect(nearPlane.surfaceTone!.palette.length).toBeLessThanOrEqual(6)
    expect(JSON.stringify(nearPlane.surfaceTone).length).toBeLessThan(1200) // compact vs ~194 KB WorldState.land
    expect(structuredClone(nearPlane.surfaceTone)).toEqual(nearPlane.surfaceTone)
    expect(nearPlane.surfaceTone!.source).toMatch(/^s2:2026-11-15/)
    expect(farPlane.surfaceTone!.source).toMatch(/^gibs:2026-11-01/)

    // Water cells (cover = 8) along one ray are excluded so coastal/lake hills never turn navy blue
    const coastalCover = { coverAt: (_lat: number, lon: number) => (lon < SHADMOT.lon ? 8 : 4) }
    const wCoast = buildWorld(makeWorldInput(SHADMOT, '2026-11-15T12:00', { cover: coastalCover, near: null, far: null, weather: null }))
    const coastNear = planesOf(wCoast).find((p) => p.plane === 'near')!
    for (const c of coastNear.surfaceTone!.palette) expect(c[2]).toBeLessThanOrEqual(Math.max(c[0], c[1]) + 0.03)
  })

  it('fades monotonically with distance and visibility, darkens at night/wet, and produces distinct seasonal/regional fallbacks', () => {
    const winterGalilee = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-02-15T12:00'))
    const summerGalilee = buildWorld(worldInput(loaded.get('rosh-pina')!, '2026-08-15T12:00'))
    const negev = buildWorld(worldInput(loaded.get('ramon-crater')!, '2026-08-15T12:00'))
    const galW = planesOf(winterGalilee).find((p) => p.plane === 'near')!
    const galS = planesOf(summerGalilee).find((p) => p.plane === 'near')!
    const neg = planesOf(negev).find((p) => p.plane === 'near')!

    expect(galW.surfaceTone!.source).toBe('climatology')
    expect(neg.surfaceTone!.source).toBe('climatology')
    // Winter Galilee is greener (lower Oklab a) than late-summer Galilee and Negev desert
    expect(labOf(galW.fill).a).toBeLessThan(labOf(galS.fill).a)
    expect(labOf(galW.fill).a).toBeLessThan(labOf(neg.fill).a)
    expect(labOf(neg.fill).l).toBeGreaterThan(labOf(galW.fill).l)

    // Distance fade via veilAt / toneAt approaches haze monotonically; night darkens even bright desert
    const haze = hexOf(hazeOf(negev))
    const gaps = [0.5, 2, 10, 35].map((km) => deltaE(hexOf(applyVeil(neg.fill, veilAt(negev, km))), haze))
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1] + 1e-3)
    expect(gaps.at(-1)!).toBeLessThan(gaps[0])

    const negevNight = buildWorld(worldInput(loaded.get('ramon-crater')!, '2026-08-15T21:00'))
    expect(moodVeilOf(negevNight).alpha).toBeGreaterThan(0.8)
    expect(labOf(toneAt(negevNight, 1)).l).toBeLessThan(0.22)
  })

  it('preserves the form/light key split on hour scrub and invalidates form key on date or land-data change', () => {
    const build = makeWorldBuilder()
    const base = makeWorldInput(SHADMOT, '2026-11-17T06:00', { cover: typedCover(4, 'worldcover-2021:local-50m'), near: null, far: null, weather: null })
    const hours: LocalTime[] = ['2026-11-17T06:00', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
    const models = hours.map((at) => planesOf(build({ ...base, selected: at })))

    // Same-UTC-day hour scrub: form keys stay IDENTICAL while light keys change
    for (const m of models.slice(1)) {
      expect(m.map((p) => p.key)).toEqual(models[0].map((p) => p.key))
    }
    expect(new Set(models.map((m) => m.map((p) => p.light.key).join('|'))).size).toBe(hours.length)

    // Date change -> form key MUST change (different season / living-land state)
    const summer = planesOf(build({ ...base, selected: '2026-08-15T12:00' }))
    expect(summer.map((p) => p.key)).not.toEqual(models[1].map((p) => p.key))

    // Satellite data arrival on the same day -> form key MUST change
    const observed = planesOf(build({
      ...base, selected: '2026-11-17T12:00',
      land: { cover: typedCover(4, 'worldcover-2021:local-50m'), near: makeNear({ date: '2026-11-15', rgb: [60, 120, 52] }), far: makeFar(), weather: null },
    }))
    expect(observed.map((p) => p.key)).not.toEqual(models[1].map((p) => p.key))

    // Painters run cleanly on a Worker-safe mock 2D context without touching DOM or clock
    const fakeCtx = (): Ctx2D => new Proxy({}, {
      get: (_, prop) => prop === 'createImageData'
        ? (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })
        : prop === 'createLinearGradient' ? () => ({ addColorStop: () => {} }) : () => {},
      set: () => true,
    }) as unknown as Ctx2D
    const env: PaintEnv = { hand: HAND, phase: 0, scale: 2, canvas: () => ({ canvas: {} as OffscreenCanvas, ctx: fakeCtx() }) }
    expect(() => { paintPlane(fakeCtx(), observed[1], env); paintPlaneLight(fakeCtx(), observed[1], env) }).not.toThrow()
  })
})
