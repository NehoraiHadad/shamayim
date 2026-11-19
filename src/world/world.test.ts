import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Place } from '../config/place'
import { loadCity } from '../data/city/cityData'
import type { CityResult } from '../data/city/types'
import { loadIsrael } from '../data/landmarks/israelData'
import { withPlaceHomes } from '../data/landmarks/placeMarks'
import { offsetKm } from '../data/landmarks/project'
import type { Landmark } from '../data/landmarks/types'
import { loadLandmarkSource } from '../data/landmarks/useLandmarks'
import { mapForecast } from '../data/openMeteo/mapForecast'
import { unpackPanorama, type StoredPanorama } from '../data/terrain/panorama'
import { terrainFromPanorama } from '../data/terrain/panoramaTerrain'
import type { SceneTerrain } from '../data/terrain/terrain'
import { waterAround } from '../data/water/waterInView'
import { waterMask, type WaterMaskFile } from '../data/water/waterMask'
import { xOf } from '../domain/camera'
import { rollForward } from '../domain/now'
import type { Forecast, HourPoint, LocalTime } from '../domain/types'
import layersFixture from '../test/fixtures/forecast-layers-2026-11-17.json'
import live from '../test/fixtures/forecast-multi-2026-11-17.json'
import { SCENE_PLACES } from '../test/scenePlaces'
import { visibilityFromHumidity } from './air'
import { unionOf } from './clouds'
import { buildWorld, makeWorldBuilder } from './world'
import { acrossOf } from './wind'
import { withVisibleSun } from './visibleSun'
import type { WorldInput, WorldState } from './types'

/**
 * The world state (docs/design/CANVAS-SCENE-PLAN.md §1a, stage C0) for the baseline places: recorded panoramas, the
 * bundled landmark, city and water data, and the recorded forecast (plus a synthetic copy with the new hourly fields).
 * No network: `fetch` reads `public/`.
 */
const TIMES: LocalTime[] = ['2026-11-17T06:20', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']
const root = path.resolve(__dirname, '../..')
const mask = waterMask(JSON.parse(fs.readFileSync(path.join(root, 'public/data/land/water.json'), 'utf8')) as WaterMaskFile)
const terrainOf = (place: Place): SceneTerrain => terrainFromPanorama(unpackPanorama(JSON.parse(fs.readFileSync(
  path.join(root, `src/test/fixtures/scene/${place.id}.panorama.json`), 'utf8')) as StoredPanorama)!, { water: waterAround(place, mask) })

const forecastFrom = (raw: unknown, placeId: string): Forecast => ({ ...mapForecast(raw), placeId, air: null, nowcast: null,
  normals: null, fetchedAt: 0, source: 'fixture', models: [] })

/** The same forecast with every hour (and now) changed alike: a sky the recording did not have. */
const everyHour = (forecast: Forecast, change: Partial<HourPoint>): Forecast => ({
  ...forecast,
  hours: forecast.hours.map((h) => ({ ...h, ...change })),
  current: { ...forecast.current, ...('cloudCover' in change ? { cloudCover: change.cloudCover! } : {}),
    ...('thickCloud' in change ? { thickCloud: change.thickCloud } : {}),
    ...('precipitation' in change ? { precipitation: change.precipitation! / 4 } : {}),
    ...('weatherCode' in change ? { weatherCode: change.weatherCode! } : {}),
    ...('windSpeed' in change ? { windSpeed: change.windSpeed! } : {}) },
})

interface Loaded { place: Place; terrain: SceneTerrain; landmarks: Landmark[]; city: CityResult | null }
const loaded = new Map<string, Loaded>()

beforeAll(async () => {
  vi.stubGlobal('document', { hidden: false })
  vi.stubGlobal('fetch', async (url: string) => {
    const file = path.join(root, 'public', url.replace(/^\//, ''))
    return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 })
  })
  const signal = new AbortController().signal
  for (const place of SCENE_PLACES) {
    const source = await loadLandmarkSource(place, signal, { israel: loadIsrael })
    loaded.set(place.id, { place, terrain: terrainOf(place), landmarks: withPlaceHomes(place, source.panoramaMarks),
      city: await loadCity(place, signal) })
  }
})
afterAll(() => { vi.unstubAllGlobals() })

function inputAt(id: string, now: LocalTime, options: { forecast?: Forecast; selected?: LocalTime | null; raw?: unknown } = {}): WorldInput {
  const { place, terrain, landmarks, city } = loaded.get(id)!
  const base = options.forecast ?? forecastFrom(options.raw ?? live, place.id)
  const forecast = withVisibleSun(rollForward(base, now), terrain, place)
  return { place, forecast, now, selected: options.selected ?? null, terrain, landmarks, city }
}
const worldAt = (id: string, now: LocalTime, options: Parameters<typeof inputAt>[2] = {}) => buildWorld(inputAt(id, now, options))
const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0)

describe('sun and moon', () => {
  it('puts the sun high in the south at noon and under the land at night', () => {
    const noon = worldAt('shadmot-mehola', '2026-11-17T12:00')
    expect(noon.bodies.sun.altitude).toBeGreaterThan(30)
    expect(noon.bodies.sun.azimuth).toBeGreaterThan(160)
    expect(noon.bodies.sun.azimuth).toBeLessThan(200)
    expect(noon.bodies.sun).toMatchObject({ up: true, overLand: true })
    expect(Math.abs(noon.bodies.sun.x - xOf(noon.bodies.sun.azimuth, noon.camera))).toBeLessThan(1)
    const night = worldAt('shadmot-mehola', '2026-11-17T21:00')
    expect(night.bodies.sun).toMatchObject({ up: false, overLand: false })
  })

  it('gives the moon its phase, lit fraction and a lit limb toward the sun', () => {
    // A waxing moon a week after new (2026-11-09) stands in the south-west in the evening.
    const { moon, sun } = worldAt('jerusalem', '2026-11-17T19:00').bodies
    expect(moon.phase).toBeGreaterThan(0.15)
    expect(moon.phase).toBeLessThan(0.4)
    expect(moon.illumination).toBeGreaterThan(0.3)
    expect(moon.illumination).toBeLessThan(0.8)
    expect(moon.up).toBe(true)
    // The sun is below the land to the west (right): the lit limb points right and down.
    expect(Math.cos(moon.tilt * Math.PI / 180)).toBeGreaterThan(0)
    expect(sun.up).toBe(false)
  })
})

describe('light', () => {
  it.each(SCENE_PLACES.map((p) => p.id))('%s: one light, lit on the sun\'s side, shadows away from it', (id) => {
    for (const now of TIMES) {
      const world = worldAt(id, now)
      const { light, bodies } = world
      if (light.source === 'sun') {
        const side = xOf(bodies.sun.azimuth, world.camera) < world.camera.width / 2 ? 'left' : 'right'
        expect(light.side, now).toBe(side)
        expect(sign(light.shadow.dx), now).toBe(side === 'left' ? 1 : -1)
        expect(light.ray![0] > 0 ? 'right' : 'left').toBe(side)
      } else {
        expect(light.source === 'moon' || light.shadow.softness === 1, now).toBe(true)
      }
    }
  })

  it('lights the land from the left at sunrise and from the sun\'s side at noon', () => {
    const morning = worldAt('shadmot-mehola', '2026-11-17T07:30', { forecast: everyHour(forecastFrom(live, 'shadmot-mehola'), { cloudCover: 0, thickCloud: 0 }) })
    expect(morning.light).toMatchObject({ source: 'sun', side: 'left' })
    expect(morning.light.direct).toBeGreaterThan(0.2)
    expect(morning.light.shadow.softness).toBeLessThan(1)
  })

  it('gives no shadow under overcast', () => {
    const grey = worldAt('haifa', '2026-11-17T12:00', { forecast: everyHour(forecastFrom(live, 'haifa'), { cloudCover: 100, thickCloud: 100 }) })
    expect(grey.light.direct).toBeLessThan(0.2)
    expect(grey.light.shadow.softness).toBe(1)
    expect(grey.light.side).toBeNull()
  })

  it('takes the moon by night: cool and dim', () => {
    const clear = everyHour(forecastFrom(live, 'jerusalem'), { cloudCover: 0, thickCloud: 0 })
    const { light } = worldAt('jerusalem', '2026-11-17T19:30', { forecast: clear })
    expect(light.source).toBe('moon')
    expect(light.colour[2]).toBeGreaterThan(light.colour[0])
    expect(light.direct).toBeLessThan(0.5)
    expect(light.direct).toBeGreaterThan(0)
  })
})

describe('air', () => {
  it('fades far land faster in thicker air', () => {
    const clear = worldAt('jerusalem', '2026-11-17T12:00', { forecast: { ...forecastFrom(live, 'jerusalem'),
      current: { ...forecastFrom(live, 'jerusalem').current, visibility: 40000 } } })
    const thick = worldAt('jerusalem', '2026-11-17T12:00', { forecast: { ...forecastFrom(live, 'jerusalem'),
      current: { ...forecastFrom(live, 'jerusalem').current, visibility: 5000 } } })
    expect(thick.air.visibilityKm).toBe(5)
    expect(thick.air.fade(10)).toBeGreaterThan(clear.air.fade(10))
    for (const world of [clear, thick]) {
      expect(world.air.fade(0)).toBe(0)
      expect(world.air.fade(5)).toBeLessThan(world.air.fade(20))
    }
  })

  it('marks where the visibility came from: the hour, now, or humidity', () => {
    const hourly = worldAt('tiberias', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T13:00' })
    expect(hourly.sources.visibility).toBe('hour')
    expect(hourly.air.visibilityKm).toBe(4)
    // The recorded answer has no visibility at all: humidity, and without it the clean default.
    const recorded = worldAt('tiberias', '2026-11-17T06:00', { selected: '2026-11-17T13:00' })
    expect(['humidity', 'default']).toContain(recorded.sources.visibility)
    expect(visibilityFromHumidity(50)).toBe(40)
    expect(visibilityFromHumidity(90)).toBeLessThan(10)
  })
})

describe('clouds and rain', () => {
  it('reads the forecast\'s layers, and falls back from the cover (marked) when it has none', () => {
    const layered = worldAt('shadmot-mehola', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-17T15:00' })
    expect(layered.sources.cloudLayers).toBe('forecast')
    expect(layered.clouds.map((l) => l.level)).toEqual(['low', 'mid', 'high'])
    const covers = Object.fromEntries(layered.clouds.map((l) => [l.level, l.cover])) as Record<'low' | 'mid' | 'high', number>
    // Together the layers make the shown cover.
    const shownCover = layered.preview ? Math.round(100 * unionOf(covers)) : null
    expect(shownCover).toBeGreaterThan(80)
    expect(worldAt('shadmot-mehola', '2026-11-17T12:00').sources.cloudLayers).toBe('cover')
  })

  it('has no rain under a dry sky, and no layer rains', () => {
    for (const now of TIMES) {
      const world = worldAt('haifa', now)
      expect(world.rain).toBeNull()
      expect(world.clouds.some((l) => l.rains)).toBe(false)
    }
  })

  it('rains only from the banks of the raining layer, at their azimuths', () => {
    const world = worldAt('haifa', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T13:00' })
    expect(world.rain).not.toBeNull()
    const raining = world.clouds.filter((l) => l.rains)
    expect(raining.map((l) => l.level)).toEqual(['low'])
    expect(world.sources.rainCloudRaised).toBe(false)
    const banks = new Map(raining[0].banks.map((bank) => [bank.id, bank]))
    for (const cell of world.rain!.cells) {
      const bank = banks.get(cell.bank)!
      expect(bank).toBeDefined()
      expect((cell.fromAzimuth + cell.toAzimuth) / 2).toBeCloseTo(bank.azimuth, 6)
    }
  })

  it('gives rain falling from a clear sky a cloud to fall from (marked)', () => {
    const odd = everyHour(forecastFrom(live, 'jerusalem'), { cloudCover: 5, thickCloud: 0, precipitation: 2, weatherCode: 61 })
    const world = worldAt('jerusalem', '2026-11-17T12:00', { forecast: odd })
    expect(world.rain).not.toBeNull()
    expect(world.sources.rainCloudRaised).toBe(true)
    const low = world.clouds.find((l) => l.level === 'low')!
    expect(low.rains).toBe(true)
    expect(low.cover).toBeGreaterThanOrEqual(0.5)
  })

  it('keeps every bank where it was when the hour changes (seeded by place and index)', () => {
    const a = worldAt('rosh-pina', '2026-11-17T12:00')
    const b = worldAt('rosh-pina', '2026-11-17T12:00')
    expect(a.keys.clouds).toBe(b.keys.clouds)
    const later = worldAt('rosh-pina', '2026-11-17T12:00', { selected: '2026-11-17T13:00' })
    const first = (w: WorldState) => w.clouds[2].banks[0]
    if (first(a) && first(later)) expect(first(later).azimuth).toBe(first(a).azimuth)
  })
})

describe('one wind', () => {
  const windy = (fromDeg: number) => {
    const forecast = everyHour(forecastFrom(layersFixture, 'haifa'), { windSpeed: 30 })
    return worldAt('haifa', '2026-11-17T06:00', { forecast: { ...forecast, hours: forecast.hours.map((h) => ({ ...h,
      windDirection: fromDeg, windAloft: null })) }, selected: '2026-11-18T13:00' })
  }

  it('moves a westerly from right to left (east is on the left), and an easterly the other way', () => {
    expect(acrossOf(270, windy(270).camera)).toBeLessThan(-0.9)
    expect(windy(270).wind.across).toBeLessThan(-0.9)
    expect(windy(90).wind.across).toBeGreaterThan(0.9)
  })

  it.each([270, 90])('from %i°: rain slant and cloud drift share its sign; drift grows with height', (fromDeg) => {
    const world = windy(fromDeg)
    const s = sign(world.wind.across)
    expect(world.sources.windDirection).toBe('hour')
    expect(world.sources.windAloft).toBe('derived')
    expect(sign(world.rain!.slant)).toBe(s)
    for (const layer of world.clouds) expect(sign(layer.drift)).toBe(s)
    const [low, mid, high] = world.clouds.map((l) => Math.abs(l.drift))
    expect(low).toBeLessThan(mid)
    expect(mid).toBeLessThan(high)
  })

  it('takes the forecast\'s wind aloft when it has it', () => {
    const world = worldAt('haifa', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T13:00' })
    expect(world.sources.windAloft).toBe('forecast')
    expect(world.wind.aloft.high).toBeGreaterThan(world.wind.aloft.low)
  })

  it('ruffles the water with it: the glint follows the wind speed', () => {
    const base = everyHour(forecastFrom(live, 'tiberias'), { cloudCover: 0, thickCloud: 0 })
    const at = (kmh: number) => worldAt('tiberias', '2026-11-17T07:30', { forecast: everyHour(base, { windSpeed: kmh }) })
    const calm = at(3)
    const gale = at(50)
    expect(calm.water.spans.length).toBeGreaterThan(0)
    if (calm.water.glints.length && gale.water.glints.length) {
      expect(calm.water.glints[0].opacity).not.toBeCloseTo(gale.water.glints[0].opacity, 3)
    }
  })
})

describe('night', () => {
  it('lights the windows in the evening, none at noon; stars only through clear sky', () => {
    const evening = worldAt('rosh-pina', '2026-11-17T21:00')
    expect(evening.night.litShare).toBe(1)
    expect(evening.night.dark).toBe(1)
    const noon = worldAt('rosh-pina', '2026-11-17T12:00')
    expect(noon.night.litShare).toBe(0)
    expect(noon.night.dark).toBe(0)
    const overcast = worldAt('rosh-pina', '2026-11-17T21:00', { forecast: everyHour(forecastFrom(live, 'rosh-pina'), { cloudCover: 100, thickCloud: 100 }) })
    expect(overcast.night.starsThrough).toBe(0)
    const clear = worldAt('rosh-pina', '2026-11-17T21:00', { forecast: everyHour(forecastFrom(live, 'rosh-pina'), { cloudCover: 0, thickCloud: 0 }) })
    expect(clear.night.starsThrough).toBe(1)
  })
})

describe('place, marks and water', () => {
  it('draws a village as its portrait and a city from outside (variant B)', () => {
    const shadmot = worldAt('shadmot-mehola', '2026-11-17T12:00')
    expect(shadmot.place3).toMatchObject({ kind: 'portrait', roofs: 'mixed' })
    const telAviv = worldAt('tel-aviv', '2026-11-17T12:00')
    expect(telAviv.place3.kind).toBe('outside')
    if (telAviv.place3.kind === 'outside') {
      expect(telAviv.place3.skyline.variant).toBe('b')
      expect(telAviv.place3.skyline.towers.length).toBeGreaterThan(0)
    }
  })

  it.each(['shadmot-mehola', 'rosh-pina', 'tel-aviv', 'jerusalem'])('%s: what is east of the place is drawn left of the dot', (id) => {
    const world = worldAt(id, '2026-11-17T12:00')
    const { landmarks, place, terrain } = loaded.get(id)!
    const width = 375
    const dotX = Number.parseFloat(terrain.centerLeft) / 100 * width
    let checked = 0
    for (const mark of world.marks) {
      const source = landmarks.find((l) => l.id === mark.id)
      if (!source || source.source === 'place') continue
      const { dx } = offsetKm(place, source)
      if (Math.abs(dx) < 0.3) continue
      const x = mark.xPct / 100 * width
      if (Math.abs(x - dotX) < 1) continue
      expect(sign(x - dotX), mark.id).toBe(dx > 0 ? -1 : 1)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('sees the lakes where they are in view, and no water where there is none', () => {
    expect(worldAt('tiberias', '2026-11-17T12:00').water.spans.map((s) => s.name)).toContain('כנרת')
    expect(worldAt('ein-gedi', '2026-11-17T12:00').water.spans.length).toBeGreaterThan(0)
    for (const id of ['tel-aviv', 'jerusalem', 'rosh-pina', 'shadmot-mehola']) {
      expect(worldAt(id, '2026-11-17T12:00').water.spans, id).toEqual([])
    }
  })

  it('wets the ground in rain and after it, drying over three hours', () => {
    const during = worldAt('haifa', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T13:00' })
    const after = worldAt('haifa', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T17:00' })
    const dry = worldAt('haifa', '2026-11-17T06:00', { raw: layersFixture, selected: '2026-11-18T10:00' })
    expect(during.ground.wet).toBe(1)
    expect(after.ground.wet).toBeGreaterThan(0)
    expect(after.ground.wet).toBeLessThan(1)
    expect(dry.ground.wet).toBe(0)
  })
})

describe('parts and keys', () => {
  it('rebuilds the light for a new hour, never the terrain or the place', () => {
    const build = makeWorldBuilder()
    const a = build(inputAt('rosh-pina', '2026-11-17T12:00'))
    const b = build({ ...inputAt('rosh-pina', '2026-11-17T12:00'), selected: '2026-11-17T15:00' })
    expect(b.terrain).toBe(a.terrain)
    expect(b.marks).toBe(a.marks)
    expect(b.keys.terrain).toBe(a.keys.terrain)
    expect(b.keys.place).toBe(a.keys.place)
    expect(b.keys.bodies).not.toBe(a.keys.bodies)
    expect(b.keys.light).not.toBe(a.keys.light)
  })

  it('is the same world for the same input', () => {
    const a = buildWorld(inputAt('ein-gedi', '2026-11-17T16:30'))
    const b = buildWorld(inputAt('ein-gedi', '2026-11-17T16:30'))
    expect(b.keys).toEqual(a.keys)
  })
})
