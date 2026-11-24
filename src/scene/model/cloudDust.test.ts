import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import { ratio } from '../../theme/contrast'
import { DUST_VEIL } from '../../theme/skyAir'
import { dustVeilPotential, skyLight } from '../../theme/skyLight'
import { airOf } from '../../world/air'
import { makeWorldBuilder, shownAir } from '../../world/world'
import { luminanceOf } from './cloudChromaticity'
import { dustSky, inDust } from './cloudDust'
import { cloudLayersOf } from './cloudLayers'
import { horizonBand, skyStops, stopAt } from './sky'
import { skyColours } from './skyColour'
import { hexOf, labOf, rgbOf } from './tone'
import type { LayerOf, RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3 }
const CLEAN = { ...DUST, pm10: 0, dust: 0 }
let ramon: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
})
afterAll(() => vi.unstubAllGlobals())

function frame(at: LocalTime, forced: typeof DUST) {
  const world = makeWorldBuilder()({ ...worldInput(ramon, at), forced })
  const sheets = cloudLayersOf(world, box).filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  expect(sheets.length).toBeGreaterThan(0)
  return { world, sheets, mid: sheets.find(({ lattice }) => lattice === 'mid'), sky: skyStops(world, box).map(([, rgb]) => rgb) }
}

it('dusty air takes a sheet by its distance and leaves its coverage', () => {
  const { mid } = frame('2026-11-17T15:00', DUST), clean = frame('2026-11-17T15:00', CLEAN).mid
  expect(mid?.through).toBeDefined()
  expect(clean).toBeDefined()
  const through = mid!.through!
  expect(Math.max(...through)).toBeLessThan(0.25)
  for (let row = 1; row < through.length; row++) expect(through[row]).toBeLessThanOrEqual(through[row - 1])
  expect(clean!.through).toBeUndefined()
  expect(mid!.alpha).toEqual(clean!.alpha)
}, 30_000)

it('keeps the dusty sky tan and brightens toward its horizon band', () => {
  const { sky, world } = frame('2026-11-17T12:00', DUST)
  const band = horizonBand(world, box)
  expect(band).not.toBeNull()
  const colours = [sky[0], sky.at(-1)!, band!.rgb]
  const veiled = dustSky(world)!
  const exposed = skyColours(world)
  const buff = labOf(rgbOf(DUST_VEIL))
  console.info('Ramon noon dust, OKLab', { top: labOf(exposed.top), buff })
  for (const [i, rgb] of [exposed.top, exposed.mid].entries()) {
    const before = labOf(veiled[i]), after = labOf(rgb)
    expect(after.l / before.l).toBeCloseTo(exposed.exposure, 6)
    expect(exposed.exposure).toBeLessThan(1)
    expect(after.a).toBeCloseTo(before.a, 6)
    expect(after.b).toBeCloseTo(before.b, 6)
    expect(Math.hypot(after.a, after.b)).toBeGreaterThan(0.75 * Math.hypot(buff.a, buff.b))
  }
  expect(luminanceOf(colours[1])).toBeGreaterThan(luminanceOf(colours[0]))
  for (const rgb of colours) {
    const { a, b } = labOf(rgb)
    const hue = (Math.atan2(b, a) * 180) / Math.PI
    expect(hue).toBeGreaterThan(70)
    expect(hue).toBeLessThan(95)
  }
}, 30_000)

it('requires coarse dust even when PM10 and fog visibility would otherwise make a thick veil', () => {
  const shown = shownAir(worldInput(ramon, '2026-11-17T12:00'))
  const air = (dust: number, opticalPm10?: number) => airOf({
    shown: { ...shown, weatherCode: 45, visibilityKm: 1, opticalPm10, pm10: opticalPm10 ?? null, dustConcentration: dust },
    visibilitySource: shown.visibilitySource, forcedVisibility: true,
  }).air
  expect(air(5, 150).dustVeilPotential).toBe(0)
  expect(air(400, 150).dustVeilPotential).toBe(dustVeilPotential(150))
  expect(air(400, 400).dustVeilPotential).toBe(1)
  expect(air(400).dustVeilPotential).toBe(0)
})

it('keeps Hero and Sentence ink at 4.6:1 against the zenith and mid gradient anchors', () => {
  const { world } = frame('2026-11-17T12:00', DUST)
  const shown = shownAir(worldInput(ramon, '2026-11-17T12:00'))
  for (let pm10 = 0; pm10 <= 1000; pm10 += 25) for (let visibilityKm = 1; visibilityKm <= 30; visibilityKm++) {
    const { air } = airOf({ shown: { ...shown, pm10, opticalPm10: pm10, dustConcentration: pm10, visibilityKm },
      visibilitySource: shown.visibilitySource, forcedVisibility: true })
    for (let altitude = -10; altitude <= 80; altitude++) {
      const palette = skyLight({ altitude, pm10, air, cloudCover: 0, wet: 0, rising: false })
      const colours = skyColours({ ...world, air, light: { ...world.light, palette },
        bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } })
      for (const [i, bg] of [colours.top, colours.mid].entries()) {
        for (const ink of i === 0 ? [palette.ink] : [palette.ink, '#E8F9FF']) {
          const actual = ratio(ink, hexOf(bg))
          if (actual < 4.6) throw new Error(`Contrast ${actual} at PM10 ${pm10}, ${visibilityKm} km, ${altitude}°, stop ${i}`)
        }
      }
    }
  }
}, 30_000)

it('tints low cloud with the overlying dust and leaves cirrus nearly neutral', () => {
  const { world } = frame('2026-11-17T12:00', DUST)
  const grey: RGB = [0.6, 0.6, 0.6]
  const low = labOf(inDust(world, grey, 0.5))
  const high = labOf(inDust(world, grey, 8))
  // At 8 km fewer than 1% of the 1.5 km exponential column remains above the cloud.
  expect(Math.hypot(high.a, high.b)).toBeLessThan(0.02 * Math.hypot(low.a, low.b))
})

it('eases the painted veil and sheet transmission over solar minutes through the daylight switches', () => {
  const { world } = frame('2026-11-17T15:00', DUST)
  let previous: { rgb: RGB[]; through: number[] } | undefined
  // Sweep at the Sun's approximate maximum altitude rate (15°/hour), holding the weather and field fixed.
  for (let minute = 0; minute <= 44; minute++) {
    const altitude = 2 + minute * (15 / 60)
    const palette = skyLight({ altitude, air: world.air, pm10: DUST.pm10, rising: false, cloudCover: 0, wet: 0 })
    const current = { ...world, light: { ...world.light, palette },
      bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } }
    const sheet = cloudLayersOf(current, box).find((layer): layer is LayerOf<'cloudSheet'> =>
      layer.kind === 'cloudSheet' && layer.lattice === 'mid')!
    const stops = skyStops(current, box)
    const rgb = [...[0, 0.25, 0.5, 0.75, 1].map((at) => stopAt(stops, at)), sheet.body, sheet.shade, sheet.lit]
    const through = sheet.through ?? sheet.ys.map(() => 1)
    if (previous) {
      const before = previous
      // The nine-degree smoothstep allows 4.17 points/minute plus a point for row quantization.
      expect(Math.max(...through.map((value, row) => Math.abs(value - before.through[row])))).toBeLessThanOrEqual(0.052)
      // Allow the same rate plus roughly two sRGB bytes for the changing background palette.
      expect(Math.max(...rgb.map((c, i) => Math.abs(luminanceOf(c) - luminanceOf(before.rgb[i]))))).toBeLessThanOrEqual(0.06)
    }
    previous = { rgb, through }
  }
}, 30_000)

it('dust the sun does not light veils nothing', () => {
  const dusty = frame('2026-11-17T21:00', DUST), clean = frame('2026-11-17T21:00', CLEAN)
  expect(dusty.sheets.every(({ through }) => !through)).toBe(true)
  expect(dusty.sky).toEqual(clean.sky)
}, 30_000)
