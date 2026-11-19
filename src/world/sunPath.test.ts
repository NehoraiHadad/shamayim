import { describe, expect, it } from 'vitest'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import { skyPoint } from './moonShape'
import { SCENE_W } from './sceneBox'
import { skylineOf } from './skyline'
import { anglePx, horizonSlope } from '../../data/terrain/angleScale'
import { withHorizon } from './skyline'
import { sunOverRidge } from './sunPath'
import { noonElevation, sunAt, sunPosition } from './sunPath'

const LAT = 32.348
const site = { lat: LAT, lon: 35.535, timezone: 'Asia/Jerusalem' }
// East on the left: the high eastern ridge (y 34) on the left, the lower west on the right.
const sky = skylineOf([[0, 34], [39, 34], [137, 68], [250, 54], [375, 54]])
const winter = { rise: '2026-11-17T06:08', set: '2026-11-17T16:36' }
const summer = { rise: '2026-06-21T05:33', set: '2026-06-21T19:49' }
const at = (d: typeof winter, t: number) => sunAt(t, d.rise, d.set, site, sky)

describe('sun path', () => {
  it('noon elevation is low in November and high in June', () => {
    expect(noonElevation('2026-11-17', LAT)).toBeCloseTo(38.6, 0)
    expect(noonElevation('2026-06-21', LAT)).toBeCloseTo(81.1, 0)
  })

  it('rises east and sets west on the ridge, south of east in winter and north of it in summer', () => {
    expect(at(winter, 0).x).toBeLessThan(0.4)
    expect(at(winter, 1).x).toBeGreaterThan(0.6)
    expect(at(summer, 0).x).toBeLessThan(at(winter, 0).x)
    expect(at(summer, 1).x).toBeGreaterThan(at(winter, 1).x)
    // At the flat-horizon times the disc's top edge stands on the line (within refraction's rounding).
    expect(Math.abs(at(winter, 0).y - sky(at(winter, 0).x))).toBeLessThan(2.5)
    expect(Math.abs(at(winter, 1).y - sky(at(winter, 1).x))).toBeLessThan(2.5)
  })

  it('stands at its true direction at every minute', () => {
    const minute = '2026-11-17T09:30'
    const { azimuth } = sunSky(utcOf(minute, site.timezone), site.lat, site.lon)
    expect(sunPosition(minute, winter.rise, winter.set, site, sky)!.x).toBeCloseTo(skyPoint(0, azimuth).x, 3)
  })

  it('peaks at midday at its true height, higher in summer', () => {
    expect(at(winter, 0.5).y).toBeLessThan(at(winter, 0.1).y)
    expect(at(summer, 0.5).y).toBeLessThan(at(winter, 0.5).y)
    const line = (at(winter, 0).y + at(winter, 1).y) / 2
    expect(line - at(winter, 0.5).y).toBeGreaterThan(anglePx(36))
    expect(line - at(winter, 0.5).y).toBeLessThan(anglePx(42))
  })

  it('rises on a slant: its true angle (90° − latitude) on the stretched low-sky scale, easing as it climbs', () => {
    const a = at(winter, 0), b = at(winter, 0.05)
    const angle = Math.atan2(a.y - b.y, Math.abs(b.x - a.x) * SCENE_W) * 180 / Math.PI
    // Up is stretched by horizonSlope / 1.5 at the horizon, so the true ~58° slant is drawn steeper.
    const drawn = Math.atan((horizonSlope() / 1.5) * Math.tan(58 * Math.PI / 180)) * 180 / Math.PI
    expect(angle).toBeGreaterThan(drawn - 14)
    expect(angle).toBeLessThan(drawn + 2)
    expect(angle).toBeLessThan(89)
  })

  it('comes over a mountain later than the flat-horizon sunrise, where the drawn ridge stands above it', () => {
    // Eye level at y 96 and a 4° wall in the east, on the left (like the Gilead from the Jordan Valley).
    const valley = withHorizon(skylineOf([[0, 96 - anglePx(4)], [145, 96 - anglePx(4)], [175, 96], [375, 96]]), 96)
    const over = sunOverRidge(0, winter.rise, winter.set, site, valley)
    expect(over.t).toBeGreaterThan(0.03)
    expect(over.y).toBeCloseTo(valley(over.x), 5)
    expect(sunAt(over.t - 0.01, winter.rise, winter.set, site, valley).y).toBeGreaterThan(valley(over.x))
    // On eye level itself the flat-horizon moment stands.
    expect(Math.abs(sunAt(0, winter.rise, winter.set, site, valley).y - 96)).toBeLessThan(2.5)
  })

  it('is null before sunrise and after sunset', () => {
    expect(sunPosition('2026-11-17T05:30', winter.rise, winter.set, site)).toBeNull()
    expect(sunPosition('2026-11-17T17:00', winter.rise, winter.set, site)).toBeNull()
    expect(sunPosition('2026-11-17T11:22', winter.rise, winter.set, site)?.t).toBeCloseTo(0.5, 1)
  })
})
