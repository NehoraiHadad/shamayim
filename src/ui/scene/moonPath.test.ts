import { describe, expect, it } from 'vitest'
import { moonPosition } from '../../astro/moon'
import { findMoonPass, moonPassAt, moonScenePoint } from './moonPath'
import { skyPoint } from './moonShape'
import { SCENE_W } from './sceneBox'
import { skylineOf } from './skyline'
import { anglePx, horizonSlope } from '../../data/terrain/angleScale'

const jerusalem = { lat: 31.778, lon: 35.235 }
// A high, bumpy ridge like the Judean hills.
const bumpy = skylineOf([[0, 34], [60, 18], [110, 30], [170, 14], [230, 32], [290, 20], [375, 36]])
const H = 3_600_000

describe('moon pass', () => {
  // 2026-11-18 21:00 UTC: an evening moon over Jerusalem.
  const at = Date.UTC(2026, 10, 18, 21, 0)
  const pass = findMoonPass(at, jerusalem)!
  const point = (ms: number) => moonScenePoint(new Date(ms), jerusalem, bumpy)

  it('finds the rise and set where the moon really crosses the horizon', () => {
    expect(pass).not.toBeNull()
    expect(pass.set - pass.rise).toBeGreaterThan(8 * H)
    expect(pass.set - pass.rise).toBeLessThan(16 * H)
    for (const t of [pass.rise, pass.set]) expect(Math.abs(moonPosition(new Date(t), jerusalem.lat, jerusalem.lon).altitude)).toBeLessThan(0.3)
    expect(moonPassAt(at + H, jerusalem)).toBe(moonPassAt(at, jerusalem))
  })

  it('stands at its true direction, rises and sets on the ridge', () => {
    const { azimuth } = moonPosition(new Date(at), jerusalem.lat, jerusalem.lon)
    expect(point(at).x).toBeCloseTo(skyPoint(0, azimuth).x, 3)
    // At the true rise and set it already shows by refraction (~0.57°) above the line.
    for (const t of [pass.rise, pass.set]) {
      const lift = bumpy(point(t).x) - point(t).y
      expect(lift).toBeGreaterThan(anglePx(0.2))
      expect(lift).toBeLessThan(anglePx(0.9))
    }
  })

  it('moves east to west on one smooth path over a bumpy ridge (no zigzag)', () => {
    const pts = Array.from({ length: 61 }, (_, i) => point(pass.rise + ((pass.set - pass.rise) * i) / 60))
    for (let i = 1; i < pts.length; i++) expect(pts[i].x).toBeLessThan(pts[i - 1].x)
    for (let i = 1; i < pts.length - 1; i++) expect(Math.abs(pts[i + 1].y - 2 * pts[i].y + pts[i - 1].y)).toBeLessThan(6)
  })

  it('rises on a slant near its true angle, not straight up, and slips behind the ridge after it sets', () => {
    const a = point(pass.rise), b = point(pass.rise + 0.5 * H)
    const angle = Math.atan2(a.y - b.y, Math.abs(b.x - a.x) * SCENE_W) * 180 / Math.PI
    const drawn = Math.atan((horizonSlope() / 1.5) * Math.tan(58 * Math.PI / 180)) * 180 / Math.PI
    expect(angle).toBeGreaterThan(drawn - 20)
    expect(angle).toBeLessThan(drawn + 2)
    expect(point(pass.set + 0.3 * H).y).toBeGreaterThan(point(pass.set).y)
  })
})
