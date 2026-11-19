import fs from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { airInput } from '../../atmo/airInput'
import { mapAir } from '../../atmo/mapAir'
import { mapMarks } from '../../atmo/life/mapMarks'
import { loadCity } from '../../data/city/cityData'
import { loadFar, panoramaFarColumns } from '../../data/city/farData'
import { loadIsrael } from '../../data/landmarks/israelData'
import { withPlaceHomes } from '../../data/landmarks/placeMarks'
import { loadLandmarkSource } from '../../data/landmarks/useLandmarks'
import { mapForecast } from '../../data/openMeteo/mapForecast'
import { unpackPanorama, type StoredPanorama } from '../../data/terrain/panorama'
import { terrainFromPanorama } from '../../data/terrain/panoramaTerrain'
import { waterAround } from '../../data/water/waterInView'
import { waterMask, type WaterMaskFile } from '../../data/water/waterMask'
import { SKYLINE_TO_KM } from '../../data/city/skylineRay'
import { rollForward } from '../../domain/now'
import type { Forecast, LocalTime } from '../../domain/types'
import { skyLight } from '../../theme/skyLight'
import { SKY_THEMES } from '../../theme/skyThemes'
import live from '../../test/fixtures/forecast-multi-2026-11-17.json'
import { SCENE_PLACES } from '../../test/scenePlaces'
import { withVisibleSun } from '../../world/visibleSun'
import { ValleyScene } from './ValleyScene'

/**
 * The scene's baseline: the whole valley scene rendered for six real places (recorded horizon panoramas, the bundled
 * landmark and city data) at dawn, noon, dusk and night. The camera migration (`docs/design/camera-fable.md` §4)
 * must keep these byte-identical until rotation lands; any change here is a visible change and needs stills.
 * Panoramas: `npx tsx scripts/fixtures/recordPanoramas.ts`.
 */
const TIMES: LocalTime[] = ['2026-11-17T06:20', '2026-11-17T12:00', '2026-11-17T16:30', '2026-11-17T21:00']

/**
 * React's `useId` values (R…r) follow the component tree's shape, not the picture: renumber them by first appearance
 * so a new, empty slot in the tree does not read as a change of the scene.
 */
export function normalizeIds(html: string) {
  const ids = [...new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]))]
  let out = html
  ids.forEach((id, n) => {
    out = out.split(`"${id}"`).join(`"id${n}"`).split(`#${id})`).join(`#id${n})`).split(`#${id}"`).join(`#id${n}"`)
  })
  return out
}

const panoramaOf = (id: string) => unpackPanorama(JSON.parse(
  fs.readFileSync(path.resolve(__dirname, `../../test/fixtures/scene/${id}.panorama.json`), 'utf8')) as StoredPanorama)!

const mask = waterMask(JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../public/data/land/water.json'), 'utf8')) as WaterMaskFile)
const terrainOf = (place: { id: string; lat: number; lon: number }) =>
  terrainFromPanorama(panoramaOf(place.id), { water: waterAround(place, mask) })

const forecastFor = (placeId: string): Forecast => ({ ...mapForecast(live), placeId, air: null, nowcast: null, normals: null,
  fetchedAt: 0, source: 'fixture', models: [] })

beforeAll(() => {
  vi.stubGlobal('document', { hidden: false })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  // The bundled data under public/ stands in for the app's own server.
  vi.stubGlobal('fetch', async (url: string) => {
    const file = path.resolve(__dirname, '../../../public', url.replace(/^\//, ''))
    return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response('', { status: 404 })
  })
})
afterAll(() => { vi.unstubAllGlobals() })

describe.each(SCENE_PLACES)('scene baseline: $id', (place) => {
  it('renders the same scene at four hours', async () => {
    const signal = new AbortController().signal
    const terrain = terrainOf(place)
    const source = await loadLandmarkSource(place, signal, { israel: loadIsrael })
    const landmarks = withPlaceHomes(place, source.panoramaMarks)
    const city = await loadCity(place, signal)
    const out: string[] = []
    for (const now of TIMES) {
      const forecast = withVisibleSun(rollForward(forecastFor(place.id), now), terrain, place)
      const shown = airInput(forecast, now, place, null)
      const air = mapAir(shown)
      const palette = { ...SKY_THEMES.clearDay, ...skyLight({ altitude: shown.sunElevation, rising: shown.localHour < 12,
        cloudCover: shown.cloudCover, wet: 0, pm10: shown.pm10 }) }
      const html = renderToStaticMarkup(createElement(ValleyScene, {
        forecast, now, selected: null, lat: place.lat, air, cloudCover: shown.cloudCover,
        ridgeLight: { palette, wet: false }, terrain, place, landmarks, city, markLife: mapMarks(shown, air),
        first: now, last: now, onScrub: () => {}, onRelease: () => {}, onNow: () => {},
      }))
      out.push(`<!-- ${now} -->\n${normalizeIds(html).replace(/></g, '>\n<')}`)
    }
    await expect(out.join('\n\n')).toMatchFileSnapshot(`__snapshots__/baseline/${place.id}.html`)
  })

  it('places the far city the same way', async () => {
    const terrain = terrainOf(place)
    const far = await loadFar()
    expect(far).not.toBeNull()
    const round = (value: unknown) => JSON.stringify(value, (_, v: unknown) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)
    const scenes = [undefined, SKYLINE_TO_KM].map((fromKm) => panoramaFarColumns(place, 375, far!, terrain.sightAt!, terrain, fromKm))
    await expect(round(scenes)).toMatchFileSnapshot(`__snapshots__/baseline/${place.id}.far.json`)
  })
})
