import { describe, expect, it } from 'vitest'
import { moonPosition } from '../../astro/moon'
import { findMoonPass, moonArcPoint, moonPassAt } from './moonPath'
import { SCENE_W } from './sceneBox'
import { skylineOf } from './skyline'

const jerusalem = { lat: 31.778, lon: 35.235 }
// A high, bumpy ridge like the Judean hills.
const bumpy = skylineOf([[0, 34], [60, 18], [110, 30], [170, 14], [230, 32], [290, 20], [375, 36]])
const H = 3_600_000

describe('moon pass', () => {
  // 2026-11-18 21:00 UTC: an evening moon over Jerusalem (up or near the horizon).
  const at = Date.UTC(2026, 10, 18, 21, 0)
  const pass = findMoonPass(at, jerusalem)!

  it('finds the rise and set where the moon really crosses the horizon', () => {
    expect(pass).not.toBeNull()
    expect(pass.set - pass.rise).toBeGreaterThan(8 * H)
    expect(pass.set - pass.rise).toBeLessThan(16 * H)
    for (const t of [pass.rise, pass.set]) expect(Math.abs(moonPosition(new Date(t), jerusalem.lat, jerusalem.lon).altitude)).toBeLessThan(0.3)
    expect(pass.peak).toBeGreaterThan(20)
    expect(moonPassAt(at + H, jerusalem)).toBe(moonPassAt(at, jerusalem))
  })

  it('rises east (right), sets west (left), on one smooth arc with a single top, over a bumpy ridge', () => {
    const pts = Array.from({ length: 61 }, (_, i) => moonArcPoint(pass, pass.rise + ((pass.set - pass.rise) * i) / 60, bumpy))
    expect(pts[0].x).toBeGreaterThan(pts[60].x)
    for (let i = 1; i < pts.length; i++) expect(pts[i].x).toBeLessThan(pts[i - 1].x)
    // y (down is +) falls to one minimum and climbs back: second differences never flip to a kink.
    for (let i = 1; i < pts.length - 1; i++) expect(pts[i - 1].y + pts[i + 1].y - 2 * pts[i].y).toBeGreaterThan(-0.01)
  })

  it('climbs on a slant at rise, not straight up', () => {
    const a = moonArcPoint(pass, pass.rise, bumpy)
    const b = moonArcPoint(pass, pass.rise + 0.5 * H, bumpy)
    const across = Math.abs(b.x - a.x) * SCENE_W
    const up = a.y - b.y
    expect(up).toBeGreaterThan(0)
    expect(across).toBeGreaterThan(up / 4)
  })

  it('slips behind the ridge after it sets', () => {
    expect(moonArcPoint(pass, pass.set + 0.3 * H, bumpy).y).toBeGreaterThan(moonArcPoint(pass, pass.set, bumpy).y)
  })
})
