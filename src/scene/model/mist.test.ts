import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AirInput } from '../../atmo/airTypes'
import type { HourPoint, LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { mistiness, mistLayers } from './mist'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const DAMP_CALM: Partial<AirInput> = { humidity: 96, cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, windSpeed: 4, windGusts: 7 }

let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces()
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const at = (id: string, time: LocalTime, forced: Partial<AirInput>) => buildWorld({ ...worldInput(places.get(id)!, time), forced })

function withHour(id: string, now: LocalTime, selected: LocalTime, patch: Partial<HourPoint>) {
  const base = worldInput(places.get(id)!, now, selected)
  const key = `${selected.slice(0, 13)}:00`
  const hours = base.forecast.hours.map((h) => (h.time === key ? { ...h, ...patch } : h))
  return buildWorld({ ...base, forecast: { ...base.forecast, hours } })
}

describe('mistLayers: radiation burn-off, real hourly fog and exclusions', () => {
  it('lays valley mist at 05:00 for damp clear calm air, thins it at 08:00, and clears it by noon', () => {
    const dawn = at('shadmot-mehola', '2026-11-17T05:00', DAMP_CALM)
    const morning = at('shadmot-mehola', '2026-11-17T08:00', DAMP_CALM)
    const noon = at('shadmot-mehola', '2026-11-17T12:00', DAMP_CALM)
    const afternoon = at('shadmot-mehola', '2026-11-17T15:00', DAMP_CALM)

    expect(mistLayers(dawn, BOX).map((l) => l.id)).toEqual(['mist.valley'])
    expect(mistLayers(morning, BOX).map((l) => l.id)).toEqual(['mist.valley'])
    expect(mistiness(morning)).toBeLessThan(mistiness(dawn))
    expect(mistLayers(noon, BOX)).toEqual([])
    expect(mistLayers(afternoon, BOX)).toEqual([])
  })

  it('keeps real hourly-source fog (valley and ground) through noon without forced overrides', () => {
    const noonFog = withHour('shadmot-mehola', '2026-11-17T06:00', '2026-11-17T12:00', {
      visibility: 1500, humidity: 96, weatherCode: 45, cloudCover: 60, cloudLow: 20, cloudMid: 20, cloudHigh: 20,
    })
    expect(noonFog.sources.visibility).toBe('hour')
    expect(mistLayers(noonFog, BOX).map((l) => l.id)).toEqual(['mist.valley', 'mist.ground'])
  })

  it('produces zero mist on an aerosol noon (PM10 400, RH 40) and no marine mist for 1%-low / 95%-mid inland', () => {
    const aerosol = at('shadmot-mehola', '2026-11-17T12:00', { pm10: 400, dust: 0, humidity: 40, visibilityKm: 30 })
    expect(mistiness(aerosol)).toBe(0)
    expect(mistLayers(aerosol, BOX)).toEqual([])

    // 1% low + 95% mid at 100% total cover rescales covers.low to 1 for cloud rendering, yet raw low is 1% -> no marine mist.
    const inlandMid = withHour('shadmot-mehola', '2026-11-17T06:00', '2026-11-17T12:00', {
      cloudCover: 100, cloudLow: 1, cloudMid: 95, cloudHigh: 0, humidity: 95, visibility: 30000, precipitation: 0, weatherCode: 3,
    })
    expect(inlandMid.air.mist.persistent).toBe(0)
    expect(mistLayers(inlandMid, BOX)).toEqual([])
  })

  it('suppresses radiation mist on an overcast night and fades band alpha continuously from 0 at thresholds', () => {
    const overcastNight = withHour('shadmot-mehola', '2026-11-17T04:00', '2026-11-17T05:00', {
      cloudCover: 100, cloudLow: 90, cloudMid: 80, cloudHigh: 0, humidity: 96, visibility: 30000, windSpeed: 3, precipitation: 0,
    })
    expect(overcastNight.air.mist.radiation).toBeLessThan(0.12)

    // Valley band alpha approaches 0 continuously right above m = 0.08, and ground band right above fog = 0.3.
    const base = at('shadmot-mehola', '2026-11-17T05:00', DAMP_CALM)
    const faintValley = mistLayers({ ...base, air: { ...base.air, mist: { radiation: 0.09, fog: 0, persistent: 0, amount: 0.09 } } }, BOX)
    const fullValley = mistLayers({ ...base, air: { ...base.air, mist: { radiation: 0.5, fog: 0, persistent: 0, amount: 0.5 } } }, BOX)
    expect(faintValley[0].bands[0].alpha).toBeLessThan(0.05)
    expect(fullValley[0].bands[0].alpha).toBeGreaterThan(0.5)

    const faintGround = mistLayers({ ...base, air: { ...base.air, mist: { radiation: 0, fog: 0.31, persistent: 0.31, amount: 0.31 } } }, BOX)
    const fullGround = mistLayers({ ...base, air: { ...base.air, mist: { radiation: 0, fog: 0.8, persistent: 0.8, amount: 0.8 } } }, BOX)
    expect(faintGround.find((l) => l.id === 'mist.ground')!.bands[0].alpha).toBeLessThan(0.05)
    expect(fullGround.find((l) => l.id === 'mist.ground')!.bands[0].alpha).toBeGreaterThan(0.3)
  })
})
