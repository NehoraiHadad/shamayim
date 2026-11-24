import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { ratio } from '../../theme/contrast'
import { skyLight } from '../../theme/skyLight'
import { airOf } from '../../world/air'
import { makeWorldBuilder, shownAir } from '../../world/world'
import { toneOf } from '../paint/shared/cloud/deck'
import { mix } from '../paint/shared/base/hand'
import { cloudLayersOf } from './cloudLayers'
import { inDust } from './cloudDust'
import { hazeOf, physicalHazeOf } from './landVeil'
import { horizonBand, skyStops, stopAt } from './sky'
import { exposeDust, skyColours } from './skyColour'
import { hexOf, labOf } from './tone'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON = '2026-11-17T12:00'
let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces(SCENE_PLACES.filter(({ id }) => ['ramon-crater', 'jerusalem'].includes(id)))
})
afterAll(() => vi.unstubAllGlobals())

it('keeps adjacent sky and band samples within .01 OKLab across dust onset and the solar ramp', () => {
  const input = worldInput(places.get('ramon-crater')!, NOON)
  const world = makeWorldBuilder()(input)
  const shown = shownAir(input)
  const sample = (pm10: number, altitude: number) => {
    const { air } = airOf({ shown: { ...shown, opticalPm10: pm10, pm10, dustConcentration: pm10, visibilityKm: 8 },
      visibilitySource: shown.visibilitySource, forcedVisibility: true })
    const palette = skyLight({ altitude, air, pm10, rising: false, cloudCover: 0, wet: 0 })
    const state = { ...world, air, light: { ...world.light, palette },
      bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } }
    const stops = skyStops(state, BOX)
    const { top, mid, horizon } = skyColours(state)
    return [top, mid, horizon, horizonBand(state, BOX)!.rgb,
      ...Array.from({ length: 17 }, (_, i) => stopAt(stops, i / 16))].map(labOf)
  }
  for (const samples of [
    Array.from({ length: 101 }, (_, i) => sample(90 + i * 0.5, 13)),
    Array.from({ length: 221 }, (_, i) => sample(140, 2 + i * 0.05)),
  ]) {
    for (let i = 1; i < samples.length; i++) {
      for (const [j, { l, a, b }] of samples[i].entries()) {
        const p = samples[i - 1][j]
        expect(Math.hypot(l - p.l, a - p.a, b - p.b)).toBeLessThanOrEqual(0.01)
      }
    }
  }
})

it('keeps ink contrast over a dusty sheet at least as high as over the same clean deck', () => {
  const input = worldInput(places.get('jerusalem')!, '2026-11-17T15:00')
  const frame = (dust: number) => makeWorldBuilder()({ ...input, forcedLayers: { low: 0.99, mid: 0, high: 0 },
    forced: { cloudCover: 99, pm10: dust, dust, visibilityKm: 3 } })
  const contrast = (world: ReturnType<typeof frame>) => {
    const sheet = cloudLayersOf(world, BOX).find((l) => l.kind === 'cloudSheet' && l.lattice === 'low')
    if (sheet?.kind !== 'cloudSheet') throw new Error('Missing low deck')
    const { xs, ys, tone, alpha, through } = sheet
    const stops = skyStops(world, BOX)
    // The upper anchors bound the text area. Compare the darkest ink contrast over occupied raster nodes.
    const middle = (BOX.landTop + world.relief.horizonY) * 0.55
    return tone.flatMap((t, i) => {
      const row = Math.floor(i / xs.length)
      if (ys[row] > middle || alpha[i] < 0.9 || xs[i % xs.length] < 0 || xs[i % xs.length] > BOX.width) return []
      const rgb = mix(stopAt(stops, ys[row] / BOX.skyHeight), toneOf(sheet, t), alpha[i] * (through?.[row] ?? 1))
      return [ratio(world.light.palette.ink, hexOf(rgb))]
    })
  }
  const clean = contrast(frame(0)), dusty = contrast(frame(400))
  expect(clean.length).toBeGreaterThan(0)
  expect(dusty.length).toBeGreaterThan(0)
  expect(Math.min(...dusty)).toBeGreaterThanOrEqual(Math.min(...clean))
})

it('shares the dust exposure with sheet diffuse light and far-land airlight', () => {
  const input = worldInput(places.get('ramon-crater')!, NOON)
  const world = makeWorldBuilder()({ ...input, forced: { pm10: 400, dust: 400, visibilityKm: 3 } })
  const clear = { ...world, air: { ...world.air, dustVeilPotential: 0 } }
  const colours = skyColours(world)
  expect(skyColours(world)).toBe(colours)
  expect(skyColours(clear).exposure).toBe(1)
  expect(hazeOf(clear)).toEqual(physicalHazeOf(clear))
  expect(hazeOf(world)).toEqual(exposeDust(physicalHazeOf(world), colours.exposure))
  const cleanSheets = cloudLayersOf(clear, BOX)
  const sheets = cloudLayersOf(world, BOX).filter((l) => l.kind === 'cloudSheet')
  expect(sheets.length).toBeGreaterThan(0)
  for (const sheet of sheets) {
    const control = cleanSheets.find((l) => l.kind === 'cloudSheet' && l.lattice === sheet.lattice)
    const layer = world.cloudField!.field.layers.find(({ lattice }) => lattice === sheet.lattice)!
    if (control?.kind !== 'cloudSheet') throw new Error('Missing control sheet')
    const tint = labOf(inDust(world, control.body, layer.baseKm)), actual = labOf(sheet.body)
    expect(actual.a).toBeCloseTo(tint.a, 5)
    expect(actual.b).toBeCloseTo(tint.b, 5)
    expect(actual.l).toBeCloseTo(tint.l * colours.exposure, 5)
  }
})

it('eases the horizon gradient into the mid anchor', () => {
  const input = worldInput(places.get('ramon-crater')!, NOON)
  const world = makeWorldBuilder()({ ...input, forced: { pm10: 400, dust: 400, visibilityKm: 3 } })
  const stops = skyStops(world, BOX)
  const end = Math.min(1, (BOX.landTop + world.relief.horizonY) / BOX.skyHeight)
  const middle = 0.55 * end, span = end - middle
  const width = span / 16
  const l = (at: number) => labOf(stopAt(stops, at)).l
  const shoulder = Math.abs(l(middle + width) - l(middle))
  const slope = Math.abs(l(middle + span / 2 + width / 2) - l(middle + span / 2 - width / 2))
  // The first cubic segment gains under an eighth of the mid-segment slope.
  expect(shoulder).toBeLessThan(slope / 8)
})
