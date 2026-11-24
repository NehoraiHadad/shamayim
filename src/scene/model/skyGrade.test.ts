import { expect, it, vi } from 'vitest'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput } from '../../test/sceneWorld'
import { ratio } from '../../theme/contrast'
import { skyLight } from '../../theme/skyLight'
import { airOf } from '../../world/air'
import { makeWorldBuilder, shownAir } from '../../world/world'
import { skyStops, stopAt } from './sky'
import { filterAt, skyFilterLayer, skyGradeOf } from './skyGrade'
import { SKY_FILTER_MID, skyFilterTransmission } from './skyFilter'
import { hexOf, mixSrgb } from './tone'
import type { RGB } from './types'

const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON = '2026-11-17T12:00'

it('leaves clear air and fog ungraded and keeps dust under the byte contrast ceilings', async () => {
  stubPublicFetch()
  try {
    const ramon = (await loadPlaces(SCENE_PLACES.filter(({ id }) => id === 'ramon-crater'))).get('ramon-crater')!
    checkGrade(worldInput(ramon, NOON))
  } finally {
    vi.unstubAllGlobals()
  }
})

function checkGrade(input: ReturnType<typeof worldInput>) {
  const world = makeWorldBuilder()(input)
  const shown = shownAir(input)
  function stateOf(pm10: number, altitude: number, fog = false) {
    const { air } = airOf({ shown: { ...shown, opticalPm10: pm10, pm10, dustConcentration: fog ? 0 : pm10,
      visibilityKm: fog ? 1 : 3, ...(fog && { weatherCode: 45 }) },
      visibilitySource: shown.visibilitySource, forcedVisibility: true })
    const palette = skyLight({ altitude, air, pm10, rising: false, cloudCover: 0, wet: 0 })
    return { ...world, air, light: { ...world.light, palette }, clouds: [], cloudField: undefined,
      bodies: { ...world.bodies, sun: { ...world.bodies.sun, altitude } } }
  }
  const noon = world.bodies.sun.altitude
  expect(skyFilterLayer(stateOf(0, noon), BOX)).toBeNull()
  expect(skyFilterLayer(stateOf(400, noon, true), BOX)).toBeNull()
  for (const pm10 of [150, 250, 400, 800]) for (const altitude of [noon, 10]) {
    const state = stateOf(pm10, altitude)
    const grade = skyGradeOf(state, BOX)!
    const stops = skyStops(state, BOX)
    const middle = SKY_FILTER_MID * grade.horizon
    for (let i = 0; i < 32; i++) {
      const y = middle * i / 31
      // The opaque sky is rasterized to sRGB bytes before the compositor blends it.
      const [r, g, b] = stopAt(stops, y / BOX.skyHeight, mixSrgb).map(c => Math.round(255 * c) / 255)
      const drawn = hexOf(filterAt(grade, y, [r, g, b]))
      expect(ratio(state.light.palette.ink, drawn), `PM10 ${pm10}, sun ${altitude}, row ${i}`).toBeGreaterThanOrEqual(4.6)
      if (i === 31) expect(ratio('#E8F9FF', drawn)).toBeGreaterThanOrEqual(4.6)
    }
    expect(grade.stops.length).toBeLessThanOrEqual(16)
    let previous: RGB = skyFilterTransmission(grade.k, 0)
    for (let i = 0; i <= 256; i++) {
      const row = i / 256
      const exact = skyFilterTransmission(grade.k, row)
      const painted = stopAt(grade.stops, row, mixSrgb)
      for (const [channel, value] of exact.entries()) {
        expect(painted[channel]).toBeGreaterThanOrEqual(previous[channel] - Number.EPSILON)
        expect(Math.abs(painted[channel] - value)).toBeLessThan(1 / 255)
      }
      previous = painted
    }
    expect(skyFilterTransmission(grade.k, 1)).toEqual([1, 1, 1])
    expect(skyFilterTransmission(grade.k, 2)).toEqual([1, 1, 1])
  }
}
