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
import { layerSnapshot } from '../../world/field/density'
import { buildField } from '../../world/field/field'
import { groundRangeAt } from '../../world/field/project'
import { transmitAlong } from '../../world/field/transmit'
import type { FieldCell } from '../../world/field/types'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }

function raysAroundCloud() {
  const altitude = 30, baseKm = 1.1, vKm = 0.4
  const field = buildField({ placeId: 'disc-test', hours: [], at: '2026-11-17T12:00',
    covers: { low: 0.25, mid: 0, high: 0 }, lowBaseKm: baseKm, elevationKm: 0,
    weatherCode: 0, sunAltitude: altitude, wind10: { speedKmh: 0, fromDeg: 0 } })
  const snapshot = layerSnapshot(field, 'low', 0, 0, 50)
  const cell: FieldCell = { id: 'opaque', lattice: 'low', genus: 'cu', rank: 0, x: 0,
    y: groundRangeAt(baseKm + vKm / 2, altitude), r: 0.5, baseKm, vKm, tau0: 25, rainWeight: 0, share: 1, seed: 1 }
  // Isolate this cell from the field's ensemble. All five solar rays fit inside its north chord.
  const isolated = { ...snapshot, layer: snapshot.layer && { ...snapshot.layer, floorTau: 0 },
    densityGrid: { ...snapshot.densityGrid, rayCells: () => new Set([cell]), meanRayDepth: () => 0 } }
  return [transmitAlong(field, [isolated], 0, altitude), transmitAlong(field, [isolated], 180, altitude)]
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
        const through = (sun: number) => bodyLayers({
          ...world, light: { ...world.light, through: { ...world.light.through, sun } },
        }, BOX).find(layer => layer.part === 'discLight')
        const [behind, gap] = raysAroundCloud()
        expect(behind).toBeLessThan(1 / 255)
        expect(gap).toBe(1)
        expect(through(behind)).toBeUndefined()
        expect(through(1 / 255 / 2)).toBeUndefined()
        expect(through(gap)?.sun?.beamAlpha).toBe(Math.floor(255 * alpha) / 255)
        let previous = 0
        for (const ray of [0.25, 0.5, 0.75, 1]) {
          const a = through(ray)?.sun?.beamAlpha ?? 0
          expect(a).toBeGreaterThanOrEqual(previous)
          previous = a
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
