import { expect, it } from 'vitest'
import { forecastUrl } from '../data/openMeteo/request'
import { SHADMOT_MEHOLA } from '../config/place'
import { fieldWeather } from './fieldWeather'

const conv = (w: ReturnType<typeof fieldWeather>) => 0.6 * w.convectiveShower + w.convectiveStorm

it('decides by the weather code alone without CAPE, as before', () => {
  expect(fieldWeather(95, 2, 80)).toMatchObject({ convectiveStorm: 1, convectiveShower: 0 })
  expect(fieldWeather(81, 2, 80)).toMatchObject({ convectiveStorm: 0, convectiveShower: 1 })
  expect(conv(fieldWeather(61, 2, 80))).toBe(0)
})

it('weighs the code by the fuel CAPE gives it', () => {
  // A thunder code over little fuel is a weaker storm than over a Levant storm-day few hundred J/kg.
  expect(conv(fieldWeather(95, 2, 80, 20))).toBeLessThan(conv(fieldWeather(95, 2, 80, 400)))
  expect(conv(fieldWeather(95, 2, 80, 400))).toBe(1)
  expect(conv(fieldWeather(95, 2, 80, 0))).toBeGreaterThanOrEqual(0.6)
  // Rain through air with fuel is showers whatever the code calls it; steady rain with none stays stratiform.
  expect(conv(fieldWeather(63, 2, 90, 400))).toBeGreaterThan(0.3)
  expect(conv(fieldWeather(63, 2, 90, 10))).toBe(0)
  // Much fuel and no rain grows Cu con; a little and dry grows nothing.
  expect(conv(fieldWeather(2, 0, 50, 1500))).toBeGreaterThan(0.2)
  expect(conv(fieldWeather(2, 0, 50, 150))).toBe(0)
})

it('asks the deployed Worker for CAPE and the freezing level, and can leave them out', () => {
  expect(forecastUrl(SHADMOT_MEHOLA)).toContain('cape%2Cfreezing_level_height')
  expect(forecastUrl(SHADMOT_MEHOLA, { stormHourly: false })).not.toContain('cape')
})
