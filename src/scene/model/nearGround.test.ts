import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { prepareLandSampler } from '../../data/land/sampleLand'
import { RAY_DISTANCES } from '../../data/terrain/panorama'
import { DATUM_PLACES, SCENE_PLACES } from '../../test/scenePlaces'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { monthFromIsoDate } from '../../world/landAgeBlend'
import { samplePoint } from '../../world/landSample'
import type { RGB, WorldState } from '../../world/types'
import { buildWorld } from '../../world/world'
import { materialAt } from '../paint/shared/land/planeMaterial'
import { preparePlaneTexels } from '../paint/shared/land/planeTexel'
import { COVER_WATER, sampleBandAtKm } from './landPalette'
import { linearRgbToSrgb, srgbRgbToLinear } from './landRadiance'
import { TEXEL } from './planeBands'
import { planeLayer } from './planes'
import { labOf } from './tone'
import type { SceneBox } from './types'

const IDS = ['haifa', 'jerusalem', 'tel-aviv', 'beit-shean', 'shadmot-mehola']
const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const NOON = '2026-11-17T12:00'
const FIRST_KM = RAY_DISTANCES[0], RAD = Math.PI / 180, M_PER_DEG = 111_320
/** One just noticeable difference in Oklab (Ottosson 2020: 0.02). */
const JND = 0.02
let loaded: Map<string, LoadedPlace>

beforeAll(async () => {
  stubPublicFetch()
  loaded = await loadPlaces([...SCENE_PLACES, ...DATUM_PLACES].filter((place) => IDS.includes(place.id)))
}, 120_000)
afterAll(() => vi.unstubAllGlobals())

const distance = (a: RGB, b: RGB) => {
  const x = labOf(a), y = labOf(b)
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}
const meanAlbedo = (colours: readonly RGB[]) => linearRgbToSrgb([0, 1, 2].map((k) =>
  colours.reduce((sum, rgb) => sum + srgbRgbToLinear(rgb)[k], 0) / colours.length) as [number, number, number])

/** The cover's dry area mean over the circle from the eye to the first DEM ring on a bearing, by 10 m points. */
function measured({ place, cover }: LoadedPlace, world: WorldState, azimuth: number) {
  const sampler = prepareLandSampler({ cover: cover ?? null, near: null, far: null, weather: null })
  const { date, utcDate, farGain, local } = world.land
  const elevationM = local.find((p) => p.eastM === 0 && p.northM === 0)!.elevationM
  const radius = FIRST_KM * 500, east = radius * Math.sin(azimuth * RAD), north = radius * Math.cos(azimuth * RAD)
  const out: RGB[] = []
  for (let n = -radius + 5; n < radius; n += 10) for (let e = -radius + 5; e < radius; e += 10) {
    if (Math.hypot(e, n) > radius) continue
    const lat = place.lat + (north + n) / M_PER_DEG
    const lon = place.lon + (east + e) / (M_PER_DEG * Math.cos(place.lat * RAD))
    const sample = samplePoint(sampler, lat, lon, elevationM, date, utcDate, monthFromIsoDate(date), farGain)
    if (sample.cover !== COVER_WATER) out.push(sample.albedo)
  }
  return out.length ? meanAlbedo(out) : null
}

describe('the ground nearer than the first DEM ring', () => {
  it.each(IDS)('has the area mean of the cover between the eye and the ring at %s', (id) => {
    const place = loaded.get(id)!, world = buildWorld(worldInput(place, NOON))
    const gaps = world.land.rays.flatMap(({ azimuth }, i) => {
      const expected = measured(place, world, azimuth)
      return expected ? [distance(sampleBandAtKm(world.land, i, FIRST_KM).albedo, expected)] : []
    })
    console.info('near ground against the cover', id, Math.max(...gaps).toFixed(4))
    expect(Math.max(...gaps)).toBeLessThan(JND / 2)
  })

  it('stands no block of its own in front of haifa, where the ground on both sides is town', () => {
    const world = buildWorld(worldInput(loaded.get('haifa')!, NOON))
    const layer = planeLayer(world, BOX, 'near', world.terrain.near, [])!
    const t = preparePlaneTexels(layer.outline, layer.bounds, layer.surfaceTone, layer.light.litField, layer.grain.seed, 0)
    // The bottom 24 px: the columns the face reaches the first ring in (x 140-232), and those it has no points in (246-300).
    const patch = (from: number, to: number) => {
      const out: RGB[] = []
      for (let i = Math.round(from / TEXEL); i < to / TEXEL; i++) for (let y = BOX.landHeight - 24; y < BOX.landHeight; y += TEXEL) {
        const x = layer.bounds.x + (i + 0.5) * TEXEL
        const v = (y - t.crestY[i]) / Math.max(1, t.footY[i] - t.crestY[i])
        if (v >= 0) out.push(linearRgbToSrgb(materialAt(t, x, y, x / BOX.width, v)))
      }
      return meanAlbedo(out)
    }
    const gap = distance(patch(140, 232), patch(246, 300))
    console.info('haifa block against its side', gap.toFixed(4))
    expect(gap).toBeLessThan(JND)
  })

  it('leaves the ground past 700 m to the rays', () => {
    const { land } = buildWorld(worldInput(loaded.get('haifa')!, NOON))
    const copy = { ...land, own: { ...land.own, albedo: [0, 0, 0] as RGB } }
    for (let i = 0; i < land.rays.length; i += 5) for (const km of [0.7, 1, 3, 20]) {
      expect(sampleBandAtKm(land, i, km)).toEqual(sampleBandAtKm(copy, i, km))
    }
  })
})
