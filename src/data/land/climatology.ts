import { koppenAt, type KoppenCode } from './koppenGrid'
import type { ClimateZone } from './types'

/**
 * Climatological fallback for albedo (sRGB 0–255), NDVI, dryness and snow probability by physical
 * coordinates `(lat, lon, elevationM)`, month (1–12) and WorldCover class index (`COVER` 0..10).
 *
 * Provenance:
 * - Global 0.5°×0.5° Köppen–Geiger table (`koppenGrid.ts`, `koppenTable.json`): generated from
 *   Beck et al. (2018), *Sci. Data* 5:180214 (`Beck_KG_V1_present_0p5.tif`) via `scripts/land/buildKoppen.ts`.
 * - Zonal sea-level mean temperature & amplitude: Peixoto & Oort (1992), *Physics of Climate*, Fig. 7.3 & 7.4.
 * - Environmental lapse rate: ISO 2533 International Standard Atmosphere (−6.5 °C / km).
 * - Per-cover NDVI bounds anchored to MODIS MOD13Q1 / MCD43A3 (Huete et al. 2002; Schaaf et al. 2002);
 *   sRGB triplets, seasonal dryness curves, winter moisture weights and snow exponents are heuristic.
 */

export interface ClimatologySample {
  rgb: [number, number, number]; ndvi: number; dryness: number; snowProb: number
  climateZone: ClimateZone; source: 'climatology'
}

type Rgb = readonly [number, number, number]
interface CoverProfile { wetRgb: Rgb; dryRgb: Rgb; wetNdvi: number; dryNdvi: number }

/** Heuristic sRGB and MOD13Q1-bounded NDVI endpoints per `COVER` index (0 unknown .. 10 moss). */
const PROFILES: Record<number, CoverProfile> = {
  0: { wetRgb: [130, 138, 104], dryRgb: [176, 162, 128], wetNdvi: 0.34, dryNdvi: 0.14 },
  1: { wetRgb: [64, 92, 54], dryRgb: [86, 102, 66], wetNdvi: 0.72, dryNdvi: 0.50 },
  2: { wetRgb: [96, 114, 72], dryRgb: [152, 140, 104], wetNdvi: 0.48, dryNdvi: 0.20 },
  3: { wetRgb: [104, 132, 74], dryRgb: [182, 166, 118], wetNdvi: 0.56, dryNdvi: 0.14 },
  4: { wetRgb: [92, 128, 68], dryRgb: [174, 156, 110], wetNdvi: 0.62, dryNdvi: 0.18 },
  5: { wetRgb: [158, 154, 148], dryRgb: [176, 170, 160], wetNdvi: 0.14, dryNdvi: 0.08 },
  6: { wetRgb: [180, 162, 134], dryRgb: [204, 184, 152], wetNdvi: 0.08, dryNdvi: 0.05 },
  7: { wetRgb: [236, 240, 246], dryRgb: [232, 236, 242], wetNdvi: -0.04, dryNdvi: -0.02 },
  8: { wetRgb: [62, 92, 118], dryRgb: [68, 98, 124], wetNdvi: -0.15, dryNdvi: -0.15 },
  9: { wetRgb: [84, 112, 76], dryRgb: [112, 126, 90], wetNdvi: 0.54, dryNdvi: 0.36 },
  10: { wetRgb: [110, 124, 92], dryRgb: [138, 138, 112], wetNdvi: 0.36, dryNdvi: 0.22 },
}

/** Heuristic winter precipitation factor `[0, 1]` by Köppen–Geiger moisture regime (for snow fallback). */
const WINTER_MOISTURE: Record<KoppenCode, number> = {
  A: 0.90, w: 0.25, B: 0.15, S: 0.40, M: 0.90, H: 0.75, C: 0.90, D: 0.90, d: 0.20, E: 0.75,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Unknown-cover land climatology RGB (0–255, TCI scale) for dryness in `[0, 1]` (explicit non-water fallback). */
export function unknownLandRgb(dryness: number): [number, number, number] {
  const t = clamp(dryness, 0, 1), p = PROFILES[0]
  return [Math.round(lerp(p.wetRgb[0], p.dryRgb[0], t)), Math.round(lerp(p.wetRgb[1], p.dryRgb[1], t)), Math.round(lerp(p.wetRgb[2], p.dryRgb[2], t))]
}

/** Annual mean temperature proxy (°C) from latitude and elevation (Peixoto & Oort 1992 + ISO 2533). */
export function meanTempProxyC(lat: number, elevationM: number): number {
  const a = Math.abs(lat)
  return 27.0 + 0.04 * a - 0.0082 * a * a - 6.5 * (elevationM / 1000)
}

/** Classifies broad climate regime from `(lat, lon)` Köppen–Geiger cell plus physical elevation effects. */
export function climateZoneAt(lat: number, lon: number, elevationM = 0): ClimateZone {
  const code = koppenAt(lat, lon)
  const tMean = meanTempProxyC(lat, elevationM)
  if ((elevationM >= 1500 && tMean < 9) || tMean < 3 || code === 'E') return 'alpine'
  if (code === 'A' || code === 'w') return 'tropical'
  if (code === 'M' || code === 'S') {
    if (elevationM < -300) return 'arid'
    if (elevationM < -50) return 'semiarid'
  }
  if (code === 'B') return 'arid'
  if (code === 'S') return elevationM > 500 && Math.abs(lat) > 30 ? 'mediterranean' : 'semiarid'
  if (code === 'M') return 'mediterranean'
  if (code === 'H') return 'humid-subtropical'
  if (code === 'D' || code === 'd') return 'continental'
  return 'temperate'
}

const solarMonth = (month: number, lat: number): number => {
  const m = ((Math.round(month) - 1) % 12 + 12) % 12
  return (lat < 0 ? (m + 6) % 12 : m) + 1
}

/** Heuristic seasonal dryness `[0, 1]` by climate regime and solar month (1 = winter, 7 = summer). */
function seasonalDryness(zone: ClimateZone, code: KoppenCode, m: number): number {
  const summerWave = 0.5 * (1 - Math.cos(((m - 1.5) / 12) * 2 * Math.PI))
  switch (zone) {
    case 'arid': return lerp(0.76, 0.96, summerWave)
    case 'semiarid': return lerp(0.42, 0.90, summerWave)
    case 'mediterranean': return lerp(0.14, 0.84, summerWave)
    case 'humid-subtropical': return lerp(0.30, 0.14, summerWave)
    case 'temperate': return lerp(0.28, 0.16, summerWave)
    case 'continental': return code === 'd' ? lerp(0.68, 0.18, summerWave) : lerp(0.32, 0.18, summerWave)
    case 'tropical': return code === 'w' ? lerp(0.58, 0.12, summerWave) : lerp(0.12, 0.24, summerWave)
    case 'alpine': return code === 'B' || code === 'd' ? lerp(0.65, 0.45, summerWave) : lerp(0.35, 0.22, summerWave)
  }
}

/** Regional annual seasonal dryness bounds `[min, max]` for `(lat, lon, elevationM)` (for climate-relative phenology). */
export function seasonalDrynessRange(lat: number, lon: number, elevationM = 0): { min: number; max: number } {
  const code = koppenAt(lat, lon)
  const zone = climateZoneAt(lat, lon, elevationM)
  const a = seasonalDryness(zone, code, 1.5), b = seasonalDryness(zone, code, 7.5)
  return { min: Math.min(a, b), max: Math.max(a, b) }
}

/** Precipitation- and temperature-aware heuristic snow-cover probability in `[0, 1]`. */
function snowProbability(lat: number, elevationM: number, m: number, cover: number, code: KoppenCode): number {
  if (cover === 7) return 0.9
  if (cover === 8) return 0
  const amp = clamp(2 + 0.28 * Math.abs(lat), 2, 16)
  const t = meanTempProxyC(lat, elevationM) - amp * Math.cos(((m - 1.5) / 12) * 2 * Math.PI)
  if (t >= 9) return 0
  const tempFactor = t <= 0
    ? clamp(0.70 + (-t) * 0.04, 0.70, 0.95)
    : clamp(Math.pow((9 - t) / 9, 2.5) * 0.70, 0, 0.70)
  return clamp(tempFactor * WINTER_MOISTURE[code], 0, 0.95)
}

/** Returns climatological albedo, NDVI, dryness and snow probability for any coordinate, month and cover. */
export function climatologyAt(
  lat: number, lon: number, elevationM: number, month: number, cover: number,
): ClimatologySample {
  const code = koppenAt(lat, lon)
  const zone = climateZoneAt(lat, lon, elevationM)
  const m = solarMonth(month, lat)
  const dryness = seasonalDryness(zone, code, m)
  const profile = PROFILES[cover] ?? PROFILES[0]
  const snowProb = snowProbability(lat, elevationM, m, cover, code)

  const winterDormant = zone === 'temperate' || zone === 'continental' || zone === 'alpine'
  const brownness = winterDormant ? 0.5 * (1 + Math.cos(((m - 1.5) / 12) * 2 * Math.PI)) * 0.65 : dryness
  const baseRgb: [number, number, number] = [
    Math.round(lerp(profile.wetRgb[0], profile.dryRgb[0], brownness)),
    Math.round(lerp(profile.wetRgb[1], profile.dryRgb[1], brownness)),
    Math.round(lerp(profile.wetRgb[2], profile.dryRgb[2], brownness)),
  ]
  const s = snowProb > 0.5 ? (snowProb - 0.5) * 1.4 : 0
  const rgb: [number, number, number] = s > 0
    ? [Math.round(lerp(baseRgb[0], 235, s)), Math.round(lerp(baseRgb[1], 239, s)), Math.round(lerp(baseRgb[2], 245, s))]
    : baseRgb
  const ndvi = lerp(profile.wetNdvi, profile.dryNdvi, brownness) * (1 - 0.7 * snowProb)

  return {
    rgb, ndvi: Math.round(ndvi * 1000) / 1000, dryness: Math.round(dryness * 1000) / 1000,
    snowProb: Math.round(snowProb * 1000) / 1000, climateZone: zone, source: 'climatology',
  }
}
