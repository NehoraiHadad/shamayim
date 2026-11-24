import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { bodyLayers, sunDisc } from './bodies'
import { luminanceOf } from './cloudChromaticity'
import { skyStops, stopAt } from './skyColour'
import { filterAt, skyGradeOf } from './skyGrade'
import { hexOf, mixSrgb, rgbOf } from './tone'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

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
      const drawn = luminanceOf(filterAt(grade, sun.y, core))
      expect(drawn, `PM10 ${pm10}, local sky`).toBeGreaterThan(luminanceOf(filterAt(grade, sun.y, at(sun.y))))
      expect(drawn, `PM10 ${pm10}, horizon`).toBeGreaterThan(luminanceOf(at(BOX.landTop + world.relief.horizonY)))
      expect(layers.find(layer => layer.part === 'aureole')?.sun?.halo ?? physical.halo).toEqual(physical.halo)
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
