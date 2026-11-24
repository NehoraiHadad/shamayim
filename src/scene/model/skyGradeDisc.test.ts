import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { bodyLayers, sunDisc } from './bodies'
import { luminanceOf } from './cloudChromaticity'
import { dustDiscColour } from './dustDisc'
import { skyStops, stopAt } from './skyColour'
import { filterAt, skyGradeOf } from './skyGrade'
import { hexOf, mixSrgb, rgbOf } from './tone'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

it('fades dust-disc contrast into the local sky across the optical-depth shoulder', () => {
  const core = rgbOf('#C3B18C'), local = rgbOf('#958870')
  const horizon = 0.61
  const at = (tau: number, weight = 1) => dustDiscColour(core, local, horizon, tau, weight)
  const localY = luminanceOf(local), brightY = horizon * 1.02
  expect(at(9, 0)).toEqual(core)
  expect(luminanceOf(at(9))).toBeCloseTo(brightY, 10)
  expect(luminanceOf(at(9, 0.5))).toBeCloseTo((luminanceOf(core) + brightY) / 2, 10)
  expect(luminanceOf(at(10.5))).toBeCloseTo((brightY + localY) / 2, 10)
  expect(luminanceOf(at(12))).toBeCloseTo(localY, 10)
  expect(luminanceOf(at(15))).toBeCloseTo(localY, 10)
})

it('keeps the dusty noon solar core above the surrounding sky and horizon', async () => {
  stubPublicFetch()
  try {
    const ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
    const input = worldInput(ramon, '2026-11-17T12:00')
    const build = makeWorldBuilder()
    for (let pm10 = 100; pm10 <= 800; pm10 += 25) {
      const world = build({ ...input, forced: { pm10, dust: pm10, visibilityKm: 3, cloudCover: 0 },
        forcedLayers: { low: 0, mid: 0, high: 0 } })
      const physical = sunDisc(world, BOX)!
      const layers = bodyLayers(world, BOX)
      const sun = layers.find(layer => layer.id === 'bodies.sun')!.sun!
      const grade = skyGradeOf(world, BOX)
      const stops = skyStops(world, BOX)
      const at = (y: number) => rgbOf(hexOf(stopAt(stops, y / BOX.skyHeight, mixSrgb)))
      const alpha = Math.max(0.1, 1 - 0.97 * sun.veil ** 0.7)
      const core = rgbOf(hexOf(mixSrgb(at(sun.y), rgbOf(hexOf(sun.core)), alpha)))
      const filtered = filterAt(grade, sun.y, core)
      const beam = layers.find(layer => layer.part === 'discLight')?.sun?.core
      const extra = beam && rgbOf(hexOf(beam))
      const drawn = luminanceOf(extra ? [Math.min(1, filtered[0] + alpha * extra[0]),
        Math.min(1, filtered[1] + alpha * extra[1]), Math.min(1, filtered[2] + alpha * extra[2])] : filtered)
      expect(drawn, `PM10 ${pm10}, local sky`).toBeGreaterThan(luminanceOf(filterAt(grade, sun.y, at(sun.y))))
      expect(drawn, `PM10 ${pm10}, horizon`).toBeGreaterThan(luminanceOf(at(BOX.landTop + world.relief.horizonY)))
      expect(layers.find(layer => layer.part === 'aureole')?.sun?.halo ?? physical.halo).toEqual(physical.halo)
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
