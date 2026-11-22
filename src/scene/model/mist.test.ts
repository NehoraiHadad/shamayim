import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { AirInput } from '../../atmo/airTypes'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { buildWorld } from '../../world/world'
import { mistiness, mistLayers } from './mist'
import type { SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const DAMP_CALM: Partial<AirInput> = { humidity: 96, cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0, windSpeed: 4, windGusts: 7 }
const DATA_FOG: Partial<AirInput> = { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45, windSpeed: 6 }

let places: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces()
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const at = (id: string, time: LocalTime, forced: Partial<AirInput>) => buildWorld({ ...worldInput(places.get(id)!, time), forced })

describe('mistLayers: radiation burn-off and persistent fog', () => {
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

  it('keeps data-reported fog (valley and ground) through noon', () => {
    const noonFog = at('shadmot-mehola', '2026-11-17T12:00', DATA_FOG)
    expect(mistLayers(noonFog, BOX).map((l) => l.id)).toEqual(['mist.valley', 'mist.ground'])
  })
})
