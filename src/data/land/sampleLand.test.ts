import { describe, expect, it } from 'vitest'
import { computeCoverMeans, MIN_CELL_VALID, sampleLandAt } from './sampleLand'
import type { FarLandGrid, LandData, NearLandGrid, RecentLandWeather } from './types'

function makeNear(opts: { validFrac?: number; ndsi?: number } = {}): NearLandGrid {
  const size = 20, reachM = 5000, stepM = 500
  const rgb = new Uint8Array(size * size * 3)
  const ndvi = new Float32Array(size * size)
  const ndsi = new Float32Array(size * size)
  const valid = new Float32Array(size * size)
  for (let i = 0; i < size * size; i++) {
    rgb.set([95, 132, 68], i * 3)
    ndvi[i] = 0.52
    ndsi[i] = opts.ndsi ?? -0.2
    valid[i] = opts.validFrac ?? 0.9
  }
  return {
    date: '2026-11-15', source: 's2:2026-11-15', fetchedAt: 0,
    lat: 32.35, lon: 35.53, reachM, stepM, size, rgb, ndvi, ndsi, valid,
  }
}

function makeFar(withRgb: boolean): FarLandGrid {
  const size = 20, reachKm = 60, stepKm = 6
  const ndvi = new Float32Array(size * size).fill(0.31)
  const rgb = withRgb ? new Uint8Array(size * size * 3) : undefined
  if (rgb) for (let i = 0; i < rgb.length; i += 3) rgb.set([150, 142, 110], i)
  return {
    date: '2026-11-18', source: 'gibs:2026-11-18', fetchedAt: 0,
    ...(withRgb ? { rgbDate: '2026-11-01', rgbSource: 'gibs:2026-11-01' as const, rgb } : {}),
    lat: 32.35, lon: 35.53, reachKm, stepKm, size, ndvi,
  }
}

const WEATHER: RecentLandWeather = {
  date: '2026-11-20', source: 'open-meteo:2026-11-20', fetchedAt: 0,
  precip14dMm: 12, precip30dMm: 22, precip60dMm: 35, daysSinceRain: 3,
  soilMoistureTop: 0.18, soilMoistureRoot: 0.22,
}

describe('sampleLandAt fallback chain and source flags', () => {
  it('uses climatology when no observations are loaded yet (never blocks first paint)', () => {
    const empty: LandData = { cover: null, near: null, far: null, weather: null }
    const s = sampleLandAt(empty, 32.35, 35.53, 11, -175)
    expect(s.rgbSource).toBe('climatology')
    expect(s.ndviSource).toBe('climatology')
    expect(s.ndsiSource).toBe('climatology')
    expect(s.drynessSource).toBe('climatology')
    expect(s.snowSource).toBe('climatology')
    expect(s.ndsi).toBeNull()
    expect(s.date).toBeNull()
  })

  it('prefers near Sentinel-2 inside ±5 km and recent Open-Meteo for dryness', () => {
    const data: LandData = { cover: { coverAt: () => 4 }, near: makeNear(), far: makeFar(true), weather: WEATHER }
    const s = sampleLandAt(data, 32.35, 35.53, 11, -175)
    expect(s.rgbSource).toBe('s2:2026-11-15')
    expect(s.ndviSource).toBe('s2:2026-11-15')
    expect(s.ndsiSource).toBe('s2:2026-11-15')
    expect(s.snowSource).toBe('s2:2026-11-15')
    expect(s.drynessSource).toBe('open-meteo:2026-11-20')
    expect(s.rgb).toEqual([95, 132, 68])
    expect(s.ndvi).toBeCloseTo(0.52, 4)
    expect(s.snowProb).toBe(0)
  })

  it('falls back to GIBS far and per-cover S2 mean outside ±5 km or when near cell is cloudy', () => {
    const cover = { coverAt: () => 4 }
    const near = makeNear()
    const means = computeCoverMeans(near, cover)
    expect(means.byCover[4].rgb).toEqual([95, 132, 68])

    // 20 km north (outside ±5 km S2 window): GIBS NDVI + GIBS SR RGB when both present
    const farWithRgb: LandData = { cover, near, far: makeFar(true), weather: null }
    const s1 = sampleLandAt(farWithRgb, 32.53, 35.53, 11, 200)
    expect(s1.rgbSource).toBe('gibs:2026-11-01')
    expect(s1.ndviSource).toBe('gibs:2026-11-18')
    expect(s1.ndsiSource).toBe('s2-mean:2026-11-15')
    expect(s1.drynessSource).toBe('climatology')

    // 20 km north without GIBS SR RGB: GIBS NDVI + per-cover S2 mean RGB
    const farNdviOnly: LandData = { cover, near, far: makeFar(false), weather: null }
    const s2 = sampleLandAt(farNdviOnly, 32.53, 35.53, 11, 200)
    expect(s2.rgbSource).toBe('s2-mean:2026-11-15')
    expect(s2.ndviSource).toBe('gibs:2026-11-18')

    // Cloudy near cell (valid < MIN_CELL_VALID) falls back to GIBS / climatology
    const cloudy: LandData = { cover, near: makeNear({ validFrac: MIN_CELL_VALID / 2 }), far: makeFar(false), weather: null }
    const s3 = sampleLandAt(cloudy, 32.35, 35.53, 11, 200)
    expect(s3.ndviSource).toBe('gibs:2026-11-18')
    expect(s3.rgbSource).toBe('climatology')
  })

  it('maps high NDSI from Sentinel-2 to snow probability', () => {
    const data: LandData = { cover: { coverAt: () => 6 }, near: makeNear({ ndsi: 0.65 }), far: null, weather: null }
    const s = sampleLandAt(data, 32.35, 35.53, 1, 1200)
    expect(s.snowProb).toBe(1)
    expect(s.snowSource).toBe('s2:2026-11-15')
  })
})
