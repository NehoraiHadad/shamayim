import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { addMinutes } from '../../domain/time'
import panorama from '../../test/fixtures/scene/jerusalem.panorama.json'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { makeWorldBuilder } from '../../world/world'
import { cloudLayersOf } from './cloudLayers'
import { skyGeom } from './sky'
import { mixRgb } from './tone'

const START = '2026-11-17T23:00'
const BOX = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
let jerusalem: LoadedPlace

beforeAll(async () => {
  stubPublicFetch()
  jerusalem = (await loadPlaces(SCENE_PLACES.filter(place => place.id === 'jerusalem'))).get('jerusalem')!
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

it('keeps the broken low sheet continuous minute by minute across midnight', () => {
  const build = makeWorldBuilder()
  const base = worldInput(jerusalem, START, START)
  const forecast = { ...base.forecast, elevation: panorama.groundM }
  let previous: { tone: number; alpha: number; luminance: number } | undefined
  for (let minute = 0; minute <= 120; minute++) {
    const selected = addMinutes(START, minute)
    const world = build({
      ...base, forecast, selected,
      forced: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 },
      forcedLayers: { low: 0.6, mid: 0, high: 0 },
    })
    const sheet = cloudLayersOf(world, BOX, skyGeom(world, BOX))
      .find(layer => layer.kind === 'cloudSheet' && layer.lattice === 'low')
    if (sheet?.kind !== 'cloudSheet') throw new Error(`Missing low sheet at ${selected}`)
    expect(sheet.genus, selected).toBe('sc')
    const luminance = sheet.tone.map(tone => {
      const [r, g, b] = tone < 0.5 ? mixRgb(sheet.lit, sheet.body, 2 * tone) : mixRgb(sheet.body, sheet.shade, 2 * tone - 1)
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    })
    const now = { tone: mean(sheet.tone), alpha: mean(sheet.alpha), luminance: mean(luminance) }
    if (previous) {
      // Use the sheet's established one-minute continuity bound for both model channels.
      expect.soft(Math.abs(now.tone - previous.tone), selected).toBeLessThanOrEqual(0.15)
      expect.soft(Math.abs(now.alpha - previous.alpha), selected).toBeLessThanOrEqual(0.15)
      // The lit endpoint can jump even while the normalised tone remains continuous.
      expect.soft(Math.abs(now.luminance - previous.luminance), selected).toBeLessThanOrEqual(0.03)
    }
    previous = now
  }
}, 120_000)
