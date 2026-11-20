import { describe, expect, it } from 'vitest'
import { SHADMOT_MEHOLA } from '../../config/place'
import { blendDirection } from '../../domain/blend'
import layers from '../../test/fixtures/forecast-layers-2026-11-17.json'
import live from '../../test/fixtures/forecast-multi-2026-11-17.json'
import { mapForecast } from './mapForecast'
import { forecastUrl, SCENE_HOURLY } from './request'

/** The hourly fields the canvas scene's world state reads (docs/design/CANVAS-SCENE-PLAN.md C0). */
describe('scene hours', () => {
  it('blends the two models\' wind directions round the circle', () => {
    expect(blendDirection({ icon: 350, ecmwf: 10 }, 0.5)).toBe(0)
    expect(blendDirection({ icon: 90, ecmwf: 180 }, 0.5)).toBe(135)
    expect(blendDirection({ icon: 270, ecmwf: null }, 0.6)).toBe(270)
    expect(blendDirection({ icon: null, ecmwf: null }, 0.6)).toBeNull()
    // Opposite and equal: the model with more weight keeps its own.
    expect(blendDirection({ icon: 90, ecmwf: 270 }, 0.5)).toBe(90)
  })

  it('asks for the scene fields by default now that the Worker serves them, and can leave them out', () => {
    const hourly = (url: string) => new URL(url).searchParams.get('hourly')!.split(',')
    expect(hourly(forecastUrl(SHADMOT_MEHOLA, { sceneHourly: false }))).not.toEqual(expect.arrayContaining([...SCENE_HOURLY]))
    expect(hourly(forecastUrl(SHADMOT_MEHOLA, { sceneHourly: true }))).toEqual(expect.arrayContaining([...SCENE_HOURLY]))
    expect(hourly(forecastUrl(SHADMOT_MEHOLA))).toEqual(expect.arrayContaining([...SCENE_HOURLY]))
  })

  it('reads the layers, the direction and the visibility of each hour (synthetic fixture)', () => {
    const hour = mapForecast(layers).hours.find((h) => h.time === '2026-11-18T13:00')!
    expect(hour).toMatchObject({ cloudLow: 95, cloudMid: 80, cloudHigh: 40, visibility: 4000, precipitation: 3.2 })
    // An afternoon hour: ICON 300°, ECMWF 310°, ICON weighted 0.6 on the near days.
    expect(hour.windDirection).toBe(304)
    expect(hour.windAloft?.high?.fromDeg).toBe(254)
    expect(hour.windAloft?.low?.speed).toBeGreaterThan(hour.windSpeed)
  })

  it('leaves them null when the answer has none (the recorded fixture, an older cache)', () => {
    const hour = mapForecast(live).hours[30]
    expect(hour.cloudLow).toBeNull()
    expect(hour.windDirection).toBeNull()
    expect(hour.visibility).toBeNull()
    expect(hour.windAloft).toBeNull()
  })

  it('reads the air at cruise level (250 hPa) when the answer has it, else leaves it null (C10)', () => {
    expect(mapForecast(layers).hours[30].cruise).toBeNull()
    const hourly = layers.hourly as Record<string, unknown[]>
    const n = hourly.time.length
    const withCruise = { ...layers, hourly: { ...hourly,
      temperature_250hPa_icon_seamless: Array(n).fill(-52), temperature_250hPa_ecmwf_ifs025: Array(n).fill(-50),
      relative_humidity_250hPa_icon_seamless: Array(n).fill(60), relative_humidity_250hPa_ecmwf_ifs025: Array(n).fill(70) } }
    const cruise = mapForecast(withCruise).hours[30].cruise!
    expect(cruise.temperature).toBeGreaterThanOrEqual(-52)
    expect(cruise.temperature).toBeLessThanOrEqual(-50)
    expect(cruise.humidity).toBeGreaterThanOrEqual(60)
    expect(cruise.humidity).toBeLessThanOrEqual(70)
  })
})
