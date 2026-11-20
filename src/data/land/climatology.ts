import type { ClimateZone } from './types'

/**
 * Climatological fallback for albedo (sRGB 0–255), NDVI, dryness and snow probability by physical
 * coordinates `(lat, lon, elevationM)`, month (1–12) and WorldCover class index (`COVER` 0..10).
 * Never uses place names or country bounding boxes — derived strictly from latitude, elevation and season.
 *
 * Provenance:
 * - Zonal sea-level mean temperature fit: Peixoto & Oort (1992), *Physics of Climate*, Fig. 7.3
 *   (`T_sea ≈ 27.0 + 0.04|lat| − 0.0082|lat|²`, ±1 °C from 0° to 70°).
 * - Environmental lapse rate: International Standard Atmosphere (ISO 2533), −6.5 °C / km.
 * - Subtropical dry belt / Mediterranean winter-rain / temperate summer-green regimes:
 *   Köppen–Geiger classification (Peel et al. 2007, *Hydrol. Earth Syst. Sci.* 11:1633–1644;
 *   Beck et al. 2018, *Sci. Data* 5:180214).
 * - Per-cover wet/dry broadband sRGB albedo & NDVI bounds: MODIS MCD43A3 surface albedo and
 *   MOD13Q1 seasonal NDVI climatologies (Gao et al. 2005; Liang 2001) mapped to ESA WorldCover 2021 classes.
 */

export interface ClimatologySample {
  rgb: [number, number, number]
  ndvi: number
  dryness: number
  snowProb: number
  climateZone: ClimateZone
  source: 'climatology'
}

type Rgb = readonly [number, number, number]
interface CoverProfile { wetRgb: Rgb; dryRgb: Rgb; wetNdvi: number; dryNdvi: number }

/**
 * Wet-season vs dry-season sRGB reflectance and NDVI per `COVER` index:
 * 0 none, 1 tree, 2 shrub, 3 grass, 4 crop, 5 built, 6 bare, 7 snow, 8 water, 9 wetland, 10 moss.
 */
const PROFILES: Record<number, CoverProfile> = {
  0: { wetRgb: [122, 134, 96], dryRgb: [176, 160, 124], wetNdvi: 0.35, dryNdvi: 0.14 },
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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Annual mean temperature proxy (°C) from latitude and elevation (Peixoto & Oort 1992 + ISA lapse). */
export function meanTempProxyC(lat: number, elevationM: number): number {
  const a = Math.abs(lat)
  return 27.0 + 0.04 * a - 0.0082 * a * a - 6.5 * (elevationM / 1000)
}

/** Classifies broad climate regime purely from `(lat, lon, elevationM)`. */
export function climateZoneAt(lat: number, _lon: number, elevationM = 0): ClimateZone {
  const a = Math.abs(lat)
  const tMean = meanTempProxyC(lat, elevationM)
  if ((elevationM >= 1500 && tMean < 9) || tMean < 3) return 'alpine'
  if (a < 15 && elevationM < 1800) return 'tropical'
  if (a > 40) return 'temperate'
  // Subtropical Hadley descending dry belt (peaking <= 29.5°), moderated by orographic uplift and
  // intensified in sub-sea-level rain-shadow depressions (adiabatic foehn drying).
  const latDry = a < 29.5 ? clamp((a - 14) / 10, 0, 1) : clamp(1 - (a - 29.5) / 5.5, 0, 1)
  const orographic = elevationM > 200 ? -0.18 * clamp((elevationM - 200) / 800, 0, 1) : 0
  const riftShadow = elevationM < -50 ? 0.38 * clamp((-elevationM - 50) / 350, 0, 1) : 0
  const aridity = clamp(latDry + orographic + riftShadow, 0, 1)
  if (aridity >= 0.72) return 'arid'
  if (aridity >= 0.56) return 'semiarid'
  return 'mediterranean'
}

/** Hemisphere-adjusted effective month (1..12, where 1 = mid-winter, 7 = mid-summer). */
function solarMonth(month: number, lat: number): number {
  const m = ((Math.round(month) - 1) % 12 + 12) % 12
  return (lat < 0 ? (m + 6) % 12 : m) + 1
}

/** Seasonal dryness in `[0, 1]` by climate zone and solar month (1 = winter, 7 = summer). */
function seasonalDryness(zone: ClimateZone, m: number): number {
  // Cosine wave peaking at 1 in July-August (m=7.5) and 0 in January-February (m=1.5).
  const summerWave = 0.5 * (1 - Math.cos(((m - 1.5) / 12) * 2 * Math.PI))
  switch (zone) {
    case 'arid': return lerp(0.76, 0.96, summerWave)
    case 'semiarid': return lerp(0.42, 0.90, summerWave)
    case 'mediterranean': return lerp(0.14, 0.82, summerWave)
    case 'temperate': return lerp(0.32, 0.16, summerWave) // greenest in summer, dormant/brown in winter
    case 'tropical': return lerp(0.12, 0.28, summerWave)
    case 'alpine': return lerp(0.45, 0.24, summerWave)
  }
}

/** Monthly mean temperature estimate (°C) using latitude-scaled seasonal amplitude (Peixoto & Oort 1992). */
function monthTempC(lat: number, elevationM: number, m: number): number {
  const mean = meanTempProxyC(lat, elevationM)
  const amp = clamp(2 + 0.28 * Math.abs(lat), 2, 16)
  return mean - amp * Math.cos(((m - 1.5) / 12) * 2 * Math.PI)
}

/** Climatological snow-cover probability in `[0, 1]` from monthly temperature proxy. */
function snowProbability(lat: number, elevationM: number, m: number, cover: number): number {
  if (cover === 7) return 0.9
  if (cover === 8) return 0
  const t = monthTempC(lat, elevationM, m)
  // Monthly mean <= 0 °C implies persistent snow; 0..8 °C tails off for episodic mid-latitude winter events.
  if (t >= 9) return 0
  if (t <= 0) return clamp(0.65 + (-t) * 0.05, 0.65, 0.95)
  return clamp(Math.pow((9 - t) / 9, 2.6) * 0.65, 0, 0.65)
}

/** Returns climatological albedo, NDVI, dryness and snow probability for any point, month and cover. */
export function climatologyAt(
  lat: number, lon: number, elevationM: number, month: number, cover: number,
): ClimatologySample {
  const zone = climateZoneAt(lat, lon, elevationM)
  const m = solarMonth(month, lat)
  const dryness = seasonalDryness(zone, m)
  const profile = PROFILES[cover] ?? PROFILES[3]
  const snowProb = snowProbability(lat, elevationM, m, cover)

  // Temperate/alpine deciduous vegetation peaks in summer (inverse of Mediterranean dry-summer curve).
  const brownness = zone === 'temperate' || zone === 'alpine'
    ? 0.5 * (1 + Math.cos(((m - 1.5) / 12) * 2 * Math.PI)) * 0.65
    : dryness
  const baseRgb: [number, number, number] = [
    Math.round(lerp(profile.wetRgb[0], profile.dryRgb[0], brownness)),
    Math.round(lerp(profile.wetRgb[1], profile.dryRgb[1], brownness)),
    Math.round(lerp(profile.wetRgb[2], profile.dryRgb[2], brownness)),
  ]
  const rgb: [number, number, number] = snowProb > 0.5
    ? [
      Math.round(lerp(baseRgb[0], 235, (snowProb - 0.5) * 1.4)),
      Math.round(lerp(baseRgb[1], 239, (snowProb - 0.5) * 1.4)),
      Math.round(lerp(baseRgb[2], 245, (snowProb - 0.5) * 1.4)),
    ]
    : baseRgb
  const ndvi = lerp(profile.wetNdvi, profile.dryNdvi, brownness) * (1 - 0.7 * snowProb)

  return {
    rgb,
    ndvi: Math.round(ndvi * 1000) / 1000,
    dryness: Math.round(dryness * 1000) / 1000,
    snowProb: Math.round(snowProb * 1000) / 1000,
    climateZone: zone,
    source: 'climatology',
  }
}
