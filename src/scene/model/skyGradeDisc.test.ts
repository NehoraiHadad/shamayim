import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { bodyLayers, sunDisc } from './bodies'
import { luminanceOf } from './cloudChromaticity'
import { solarAerosolSlantDepth } from './cloudDust'
import { dustDiscColour, sunDiscAlpha } from './dustDisc'
import { skyColours, skyStops, stopAt } from './skyColour'
import { filterAt, skyGradeOf, unfilterDisc } from './skyGrade'
import { hexOf, mixLight, mixSrgb, rgbOf } from './tone'
import { aerosolDepth550, HAZE_KM } from '../../world/sceneLight'
import type { WorldState } from '../../world/types'
import type { LayerOf } from './types'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

/** The dust beam under nothing but a sheet that lets that much through. */
function beamThrough(world: WorldState, through: number) {
  const ys = [0, BOX.skyHeight]
  const sheet = { kind: 'cloudSheet', xs: [0, BOX.width], ys, alpha: Array<number>(4).fill(1 - through) } as LayerOf<'cloudSheet'>
  return bodyLayers({ ...world, cloudField: undefined }, BOX, undefined, [sheet]).find(({ part }) => part === 'discLight')?.sun?.beamAlpha
}

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
    let checkedBeam = false
    for (let pm10 = 100; pm10 <= 800; pm10 += 25) {
      const world = build({ ...input, forced: { pm10, dust: pm10, visibilityKm: 3, cloudCover: 0 },
        forcedLayers: { low: 0, mid: 0, high: 0 } })
      const physical = sunDisc(world, BOX)!
      const layers = bodyLayers(world, BOX)
      const sun = layers.find(layer => layer.id === 'bodies.sun')!.sun!
      const grade = skyGradeOf(world, BOX)
      const stops = skyStops(world, BOX)
      const at = (y: number) => rgbOf(hexOf(stopAt(stops, y / BOX.skyHeight, mixSrgb)))
      const alpha = sunDiscAlpha(sun.veil)
      const core = rgbOf(hexOf(mixSrgb(at(sun.y), rgbOf(hexOf(sun.core)), alpha)))
      const filtered = filterAt(grade, sun.y, core)
      const beam = layers.find(layer => layer.part === 'discLight')?.sun
      const extra = beam && rgbOf(hexOf(beam.core))
      const beamAlpha = beam?.beamAlpha ?? 0
      const drawn = luminanceOf(extra ? [Math.min(1, filtered[0] + beamAlpha * extra[0]),
        Math.min(1, filtered[1] + beamAlpha * extra[1]), Math.min(1, filtered[2] + beamAlpha * extra[2])] : filtered)
      expect(drawn, `PM10 ${pm10}, local sky`).toBeGreaterThan(luminanceOf(filterAt(grade, sun.y, at(sun.y))))
      expect(drawn, `PM10 ${pm10}, horizon`).toBeGreaterThan(luminanceOf(at(BOX.landTop + world.relief.horizonY)))
      expect(layers.find(layer => layer.part === 'aureole')?.sun?.halo ?? physical.halo).toEqual(physical.halo)
      if (beam && !checkedBeam) {
        checkedBeam = true
        expect(beamThrough(world, 0)).toBeUndefined()
        expect(beamThrough(world, 1 / 1024)).toBeUndefined()
        expect(beamThrough(world, 1)).toBe(Math.floor(255 * alpha) / 255)
        // The sheet and the beam are both drawn in whole bytes; a beam under one byte is not drawn.
        let previous = 0
        for (const ray of [0.25, 0.5, 0.75, 1]) {
          const beamAlpha = beamThrough(world, ray) ?? 0
          expect(beamAlpha).toBeLessThanOrEqual(ray * alpha + 2 / 255)
          expect(beamAlpha).toBeGreaterThanOrEqual(previous)
          previous = beamAlpha
        }
      }
    }
    expect(checkedBeam).toBe(true)
    const world = build({ ...input, forced: { pm10: 400, dust: 400, visibilityKm: 3, cloudCover: 0 },
      forcedLayers: { low: 0, mid: 0, high: 0 } })
    for (const tau of [12, 15]) {
      const altitude = 8
      // Invert the mixed-layer extinction law at this zenith angle.
      const mass = solarAerosolSlantDepth({ ...world.air, visibilityKm: 1 }, altitude) / aerosolDepth550(1)
      const air = { ...world.air, dustWeight: 0.5, visibilityKm: 3.912 / (0.0116 + tau / (mass * HAZE_KM)) }
      const state = { ...world, air, bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } }
      const physical = sunDisc(state, BOX)!
      const sun = bodyLayers(state, BOX).find(layer => layer.id === 'bodies.sun')!.sun!
      const grade = skyGradeOf(state, BOX), colours = skyColours(state)
      const local = filterAt(grade, sun.y, stopAt(skyStops(state, BOX), sun.y / BOX.skyHeight, mixSrgb))
      expect(solarAerosolSlantDepth(air, altitude)).toBeCloseTo(tau, 10)
      expect(physical.coin).toBeLessThanOrEqual(0.5)
      const expected = unfilterDisc(grade, sun.y, mixLight(physical.limb, local, colours.bandWeight))
      for (const [channel, value] of sun.limb.entries()) expect(value).toBeCloseTo(expected[channel], 10)
    }
  } finally {
    vi.unstubAllGlobals()
  }
}, 30_000)
