import { describe, expect, it } from 'vitest'
import { sunPosition as sunSky } from '../../astro/sun'
import { utcOf } from '../../astro/utc'
import { skyPoint } from './moonShape'
import { SCENE_W } from './sceneBox'
import { skylineOf } from './skyline'
import { ALT_PX } from './skyProjection'
import { noonElevation, sunAt, sunPosition } from './sunPath'

const LAT = 32.348
const site = { lat: LAT, lon: 35.535, timezone: 'Asia/Jerusalem' }
const sky = skylineOf([[0, 54], [125, 54], [238, 68], [336, 34], [375, 34]])
const winter = { rise: '2026-11-17T06:08', set: '2026-11-17T16:36' }
const summer = { rise: '2026-06-21T05:33', set: '2026-06-21T19:49' }
const at = (d: typeof winter, t: number) => sunAt(t, d.rise, d.set, site, sky)

describe('sun path', () => {
  it('noon elevation is low in November and high in June', () => {
    expect(noonElevation('2026-11-17', LAT)).toBeCloseTo(38.6, 0)
    expect(noonElevation('2026-06-21', LAT)).toBeCloseTo(81.1, 0)
  })

  it('rises east and sets west on the ridge, south of east in winter and north of it in summer', () => {
    expect(at(winter, 0).x).toBeGreaterThan(0.6)
    expect(at(winter, 1).x).toBeLessThan(0.4)
    expect(at(summer, 0).x).toBeGreaterThan(at(winter, 0).x)
    expect(at(summer, 1).x).toBeLessThan(at(winter, 1).x)
    expect(at(winter, 0).y).toBeCloseTo(sky(at(winter, 0).x), 0)
    expect(at(winter, 1).y).toBeCloseTo(sky(at(winter, 1).x), 0)
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
    expect(line - at(winter, 0.5).y).toBeGreaterThan(ALT_PX * Math.sin(36 * Math.PI / 180))
    expect(line - at(winter, 0.5).y).toBeLessThan(ALT_PX * Math.sin(42 * Math.PI / 180))
  })

  it('rises on a slant, at about its true angle (90° − latitude), not straight up', () => {
    const a = at(winter, 0), b = at(winter, 0.05)
    const angle = Math.atan2(a.y - b.y, Math.abs(b.x - a.x) * SCENE_W) * 180 / Math.PI
    expect(angle).toBeGreaterThan(45)
    expect(angle).toBeLessThan(70)
  })

  it('is null before sunrise and after sunset', () => {
    expect(sunPosition('2026-11-17T05:30', winter.rise, winter.set, site)).toBeNull()
    expect(sunPosition('2026-11-17T17:00', winter.rise, winter.set, site)).toBeNull()
    expect(sunPosition('2026-11-17T11:22', winter.rise, winter.set, site)?.t).toBeCloseTo(0.5, 1)
  })
})
