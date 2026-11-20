import { describe, expect, it } from 'vitest'
import { SCENE_CAMERA } from '../domain/camera'
import type { HourPoint, LocalTime } from '../domain/types'
import { banksOf } from './clouds'
import { airDim, cloudDriftKm, discShare, DISC_PX, eveningShare, faceLight, hourBetween, lambert, NORMALS, viewDir } from './livingLight'

/*
 * The living light (the owner's report of 2026-11-20: the light changed sharply instead of living): the geometry and the
 * reading in time that every light parameter is built from, each continuous.
 */

describe('a body\'s disc over the drawn land', () => {
  it('is the exact circular segment of the true disc when the edge is sharp', () => {
    const r = DISC_PX
    // Numeric area of the part of a disc of radius r above a line c below its centre.
    const numeric = (c: number) => {
      let inside = 0, total = 0
      for (let i = 0; i < 400; i++) for (let j = 0; j < 400; j++) {
        const x = -r + (2 * r * (i + 0.5)) / 400, y = -r + (2 * r * (j + 0.5)) / 400
        if (x * x + y * y > r * r) continue
        total++
        if (y > -c) inside++
      }
      return inside / total
    }
    for (const c of [-r, -0.7 * r, -0.3 * r, 0, 0.4 * r, 0.8 * r, r]) expect(discShare(c, r, 0)).toBeCloseTo(numeric(c), 2)
  })

  it('is half at the edge, whole well over it, none well behind it, and never falls as the disc rises', () => {
    expect(discShare(0)).toBeCloseTo(0.5, 6)
    expect(discShare(20)).toBe(1)
    expect(discShare(-20)).toBe(0)
    let last = 0
    for (let c = -8; c <= 8; c += 0.05) {
      const v = discShare(c)
      expect(v).toBeGreaterThanOrEqual(last - 1e-12)
      // Softened: no step larger than a smooth ramp over the disc and its edge gives (~0.06 per 0.05 px at most).
      expect(v - last).toBeLessThan(0.02)
      last = v
    }
  })

  it('dims the sun continuously with the air it crosses: a low sun lights less than a high one, never nothing above the horizon', () => {
    let last = 0
    for (let alt = -0.5; alt <= 60; alt += 0.25) {
      const v = airDim(alt, { visibilityKm: 30 })
      expect(v).toBeGreaterThanOrEqual(last - 1e-9)
      expect(v - last).toBeLessThan(0.05)
      last = v
    }
    expect(airDim(1, {})).toBeGreaterThan(0.15)
    expect(airDim(1, {})).toBeLessThan(0.5)
    expect(airDim(60, {})).toBeGreaterThan(0.95)
    // Haze dims and dust dims: the same sun lights less through them.
    expect(airDim(5, { visibilityKm: 8 })).toBeLessThan(airDim(5, { visibilityKm: 40 }))
  })
})

describe('Lambert shading by a surface\'s true normal', () => {
  it('is 1 square to the light, falls monotonically with the angle, and is 0 past the edge (its wrap aside)', () => {
    for (const wrap of [0, 0.15, 0.3]) {
      let last = Infinity
      for (let deg = 0; deg <= 180; deg += 1) {
        const a = (deg * Math.PI) / 180
        // The light turned `deg` from the front face's normal (toward the eye), in the horizontal plane.
        const v = lambert(NORMALS.front, { across: Math.sin(a), ahead: -Math.cos(a), up: 0 }, wrap)
        expect(v).toBeLessThanOrEqual(last + 1e-12)
        if (deg === 0) expect(v).toBeCloseTo(1, 9)
        if (deg >= 90 + (Math.asin(wrap) * 180) / Math.PI + 1) expect(v).toBe(0)
        last = v
      }
    }
  })

  it('turns the lit side through the view axis without a flip: each side face changes by small steps, and they are equal straight ahead', () => {
    let prev: ReturnType<typeof faceLight> | null = null
    for (let az = 150; az <= 210; az += 0.25) {
      const f = faceLight(viewDir(az, 35, SCENE_CAMERA), 0.9)
      if (prev) {
        for (const k of ['left', 'right', 'front', 'top', 'rim', 'across'] as const) expect(Math.abs(f[k] - prev[k]), `${k} at ${az}`).toBeLessThan(0.05)
      }
      if (Math.abs(az - 180) < 1e-9) {
        expect(f.left).toBeCloseTo(f.right, 9)
        expect(f.across).toBeCloseTo(0, 9)
      }
      prev = f
    }
    // A sun to the east (the screen's left, the camera facing south) lights the left faces; to the west the right.
    expect(faceLight(viewDir(140, 20, SCENE_CAMERA), 1).left).toBeGreaterThan(faceLight(viewDir(140, 20, SCENE_CAMERA), 1).right)
    expect(faceLight(viewDir(220, 20, SCENE_CAMERA), 1).right).toBeGreaterThan(faceLight(viewDir(220, 20, SCENE_CAMERA), 1).left)
    // Low and ahead, the walls the eye sees are back-lit: a rim, no front light.
    const back = faceLight(viewDir(180, 5, SCENE_CAMERA), 1)
    expect(back.rim).toBeGreaterThan(0.5)
    expect(back.front).toBe(0)
  })

  it('fades every face out with the direct light, to nothing under a sky alone', () => {
    const dir = viewDir(150, 30, SCENE_CAMERA)
    const none = faceLight(dir, 0.02)
    expect(Math.max(none.left, none.right, none.front, none.top, none.rim)).toBe(0)
    let last = -1
    for (let d = 0; d <= 1; d += 0.01) {
      const v = faceLight(dir, d).left
      expect(v).toBeGreaterThanOrEqual(last)
      expect(v - Math.max(0, last)).toBeLessThan(0.05)
      last = v
    }
  })
})

describe('the cloud and the hours read in time', () => {
  const hour = (time: string, low: number, mid: number, high: number, extra: Partial<HourPoint> = {}): HourPoint => ({
    time: time as LocalTime, temperature: 15, precipProb: 0, precipitation: 0, weatherCode: 2, cloudCover: Math.max(low, mid, high),
    windSpeed: 10, windGusts: 15, humidity: 60, snowDepth: 0, cloudLow: low, cloudMid: mid, cloudHigh: high, visibility: 30000, ...extra })
  const hours = [hour('2026-11-17T12:00', 0, 40, 80), hour('2026-11-17T13:00', 60, 20, 40, { visibility: 10000 })]

  it('interpolates the layers and the visibility straight between forecast hours', () => {
    expect(hourBetween(hours, '2026-11-17T12:00')!.cloudLow).toBe(0)
    const half = hourBetween(hours, '2026-11-17T12:30')!
    expect(half.cloudLow).toBeCloseTo(30, 9)
    expect(half.cloudMid).toBeCloseTo(30, 9)
    expect(half.cloudHigh).toBeCloseTo(60, 9)
    expect(half.visibility).toBeCloseTo(20000, 6)
    // Continuous into the next hour: the last minute reads almost the next hour's.
    expect(hourBetween(hours, '2026-11-17T12:59')!.cloudLow).toBeCloseTo(59, 9)
    expect(hourBetween(hours, '2026-11-17T13:00')!.cloudLow).toBe(60)
  })

  it('gathers a bank as the cover grows, never popping one in or out', () => {
    let prev = banksOf('p', 'low', 0, 1500)
    for (let c = 0.0025; c <= 1; c += 0.0025) {
      const now = banksOf('p', 'low', c, 1500)
      // The same banks in the same places; what changes is how far the newest has gathered.
      const shares = (b: typeof now) => b.map((bank) => bank.share ?? 1)
      const a = shares(prev), b = shares(now)
      for (let i = 0; i < Math.max(a.length, b.length); i++) expect(Math.abs((b[i] ?? 0) - (a[i] ?? 0)), `${c} bank ${i}`).toBeLessThan(0.1)
      for (let i = 0; i < Math.min(prev.length, now.length); i++) expect(now[i].azimuth).toBe(prev[i].azimuth)
      prev = now
    }
    // Whole banks where the rounded count had them (cover × 16 ≥ i + ½).
    expect(banksOf('p', 'low', 0.5, 1500).filter((b) => (b.share ?? 1) === 1).length).toBe(Math.round(0.5 * 16))
  })

  it('eases the lit windows over each change of the night instead of stepping on the hour', () => {
    let last = eveningShare(0)
    for (let h = 0; h <= 24; h += 1 / 60) {
      const v = eveningShare(h)
      expect(Math.abs(v - last), `${h}`).toBeLessThan(0.05)
      last = v
    }
    expect(eveningShare(20)).toBeCloseTo(1, 6)
    expect(eveningShare(3)).toBeCloseTo(0.2, 6)
    expect(eveningShare(10)).toBeCloseTo(0.5, 6)
  })

  it('carries the cloud shadows continuously through the day, faster with more wind', () => {
    const day = Array.from({ length: 25 }, (_, h) => hour(`2026-11-17T${String(h % 24).padStart(2, '0')}:00`, 40, 0, 0,
      { windAloft: { low: { speed: h < 12 ? 20 : 40, fromDeg: 270 }, mid: null, high: null } }))
      .slice(0, 24)
    const across = () => 1
    let last = cloudDriftKm(day, '2026-11-17T00:00', across)
    for (let m = 1; m < 24 * 60; m++) {
      const at = `2026-11-17T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` as LocalTime
      const v = cloudDriftKm(day, at, across)
      const step = v - last
      expect(step).toBeGreaterThan(0)
      // A minute carries it under 1 km at 40 km/h.
      expect(step).toBeLessThan(0.7)
      last = v
    }
    expect(cloudDriftKm(day, '2026-11-17T06:00', across)).toBeCloseTo(6 * 20, 6)
  })
})
