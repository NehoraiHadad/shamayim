import { beforeAll, expect, it } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import type { LocalTime } from '../../domain/types'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { skyStops } from './sky'
import { labOf } from './tone'
import type { LayerOf, RGB } from './types'

const box = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const DUST = { pm10: 400, dust: 400, visibilityKm: 3 }
const CLEAN = { ...DUST, pm10: 0, dust: 0 }
let ramon: LoadedPlace
beforeAll(async () => {
  stubPublicFetch()
  ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
})

function frame(at: LocalTime, forced: typeof DUST) {
  const world = makeWorldBuilder()({ ...worldInput(ramon, at), forced })
  const sheets = cloudLayersOf(world, box).filter((l): l is LayerOf<'cloudSheet'> => l.kind === 'cloudSheet')
  return { sheets, mid: sheets.find(({ lattice }) => lattice === 'mid')!, sky: skyStops(world, box).map(([, rgb]) => rgb) }
}
const luminance = (rgb: RGB) => linearLuminance(srgbRgbToLinear(rgb))

it('dusty air takes a sheet by its distance and leaves its coverage', () => {
  const { mid } = frame('2026-11-17T15:00', DUST), clean = frame('2026-11-17T15:00', CLEAN).mid
  expect(mid.through).toBeDefined()
  expect(Math.max(...mid.through!)).toBeLessThan(0.25)
  for (let row = 1; row < mid.ys.length; row++) expect(mid.through![row]).toBeLessThanOrEqual(mid.through![row - 1])
  expect(clean.through).toBeUndefined()
  expect(mid.alpha).toEqual(clean.alpha)
  expect(mid.key).not.toBe(clean.key)
}, 30_000)

it('the sky of a dusty day is one pale tan, lighter at the horizon, and its clouds stand in the same light', () => {
  const { sky, sheets } = frame('2026-11-17T15:00', DUST)
  const share = luminance(sky[0]) / luminance(sky.at(-1)!)
  expect(share).toBeGreaterThan(0.6)
  expect(share).toBeLessThan(1)
  for (const rgb of [...sky, ...sheets.flatMap(({ lit, body }) => [lit, body])]) {
    const { a, b } = labOf(rgb)
    const hue = (Math.atan2(b, a) * 180) / Math.PI
    expect(Math.hypot(a, b)).toBeLessThan(0.05)
    expect(hue).toBeGreaterThan(70)
    expect(hue).toBeLessThan(95)
  }
}, 30_000)

it('dust the sun does not light veils nothing', () => {
  const dusty = frame('2026-11-17T21:00', DUST), clean = frame('2026-11-17T21:00', CLEAN)
  expect(dusty.sheets.every(({ through }) => !through)).toBe(true)
  expect(dusty.sky).toEqual(clean.sky)
}, 30_000)
