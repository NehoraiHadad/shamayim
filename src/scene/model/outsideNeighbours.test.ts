import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import type { AirInput } from '../../atmo/airTypes'
import type { LocalTime } from '../../domain/types'
import { loadPlaces, stubPublicFetch, worldInput, type LoadedPlace } from '../../test/sceneWorld'
import { outsideItemKm } from '../../world/outsideDepth'
import type { OutsideView } from '../../world/types'
import { buildWorld } from '../../world/world'
import { linearLuminance, srgbRgbToLinear } from './landRadiance'
import { outsideLayer } from './outside'
import type { OutsideItem, SceneBox } from './types'

const BOX: SceneBox = { width: 375, skyHeight: 428, landTop: 300, landHeight: 128, dpr: 2 }
const PLACES = ['jerusalem', 'haifa', 'tiberias', 'tel-aviv', 'rosh-pina']
const TIMES = ['06:00', '06:20', '07:00', '12:00', '16:30', '17:00', '17:30']
const WEATHER: Record<string, Partial<AirInput>> = {
  clear: { cloudCover: 0, thickCloud: 0, precipitation: 0, weatherCode: 0 },
  fog: { humidity: 99, visibilityKm: 1.5, cloudCover: 60, thickCloud: 30, precipitation: 0, weatherCode: 45 },
  haze: { pm10: 400, dust: 400, visibilityKm: 3 },
  broken: { cloudCover: 50, thickCloud: 35, precipitation: 0, weatherCode: 2 },
}
/** Neighbours stand this close across the frame (scene px) and in depth (km, and as a ratio of the nearer one). */
const NEAR_X = 24, NEAR_KM = .25, NEAR_RATIO = 1.2
/** A pair may step this much in any painted channel (covers luminance and hue together). */
const STEP = 9 / 255

let places: Map<string, LoadedPlace>
beforeAll(async () => {
  stubPublicFetch()
  places = await loadPlaces()
}, 120_000)
afterAll(() => { vi.unstubAllGlobals() })

const CASES = PLACES.flatMap(place => Object.keys(WEATHER).map(weather => [place, weather] as const))
it.each(CASES)('keeps adjacent %s walls of one material continuous in %s', (place, weather) => {
  let pairs = 0, worst = { step: 0, lum: 1, tint: 1, at: '' }
  for (const time of TIMES) {
    const world = buildWorld({ ...worldInput(places.get(place)!, `2026-11-17T${time}` as LocalTime), forced: WEATHER[weather] })
    const { frame, baseKm, skyline } = world.place3 as OutsideView
    const layer = outsideLayer(world, BOX)!
    const sx = BOX.width / 375
    const kmOf = new Map(skyline.boxes.map(b => [`${b.x * sx}|${b.top}|${b.foot}`, outsideItemKm(frame, baseKm, b)]))
    const walls = layer.items.flatMap(item => {
      const box = item as Extract<OutsideItem, { kind: 'box' }>
      const km = item.kind === 'box' && !item.beyond ? kmOf.get(`${item.x}|${item.top}|${item.foot}`) : undefined
      if (km === undefined) return []
      const rgb = layer.receivers![box.tier][box.receiver].unresolved
      return [{ x: box.x, km, receiver: box.receiver, rgb }]
    }).sort((a, b) => a.x - b.x)
    for (let i = 0; i < walls.length; i++) {
      for (let j = i + 1; j < walls.length && walls[j].x - walls[i].x <= NEAR_X; j++) {
        const a = walls[i], b = walls[j]
        if (a.receiver !== b.receiver || Math.abs(a.km - b.km) > NEAR_KM
          || Math.max(a.km, b.km) > NEAR_RATIO * Math.min(a.km, b.km)) continue
        pairs++
        const la = srgbRgbToLinear(a.rgb), lb = srgbRgbToLinear(b.rgb)
        const step = Math.max(...a.rgb.map((c, k) => Math.abs(c - b.rgb[k])))
        const lum = linearLuminance(la) / linearLuminance(lb), tint = la[2] / la[0] / (lb[2] / lb[0])
        if (step > worst.step) worst = { step, lum: Math.max(lum, 1 / lum), tint: Math.max(tint, 1 / tint),
          at: `${time} x ${a.x.toFixed(0)}-${b.x.toFixed(0)} km ${a.km.toFixed(2)}/${b.km.toFixed(2)}` }
      }
    }
  }
  expect(pairs, 'compare real neighbours').toBeGreaterThan(50)
  expect(worst.step, `${worst.at}, luminance x${worst.lum.toFixed(2)}, B/R x${worst.tint.toFixed(2)}`).toBeLessThan(STEP)
}, 60_000)
