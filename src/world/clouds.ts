import { hashId, seeded } from '../data/landmarks/hash'
import type { WeightedSighting } from '../domain/cloudSightings'
import type { HourPoint } from '../domain/types'
import { smoothstep } from './ridgeLighting'
import type { CloudBank, CloudLayer, CloudLevel, Wind, WorldSources } from './types'

export const LEVELS: CloudLevel[] = ['low', 'mid', 'high']

export interface Covers { low: number; mid: number; high: number }

/** The share of the sky the three layers cover together, taken as independent (as `thickCloud` does). */
export const unionOf = ({ low, mid, high }: Covers) => 1 - (1 - low) * (1 - mid) * (1 - high)

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface CoverInput {
  /** The shown cover (0–100), satellite-corrected for now. */
  cloudCover: number
  /** The shown low + mid cloud (0–100), when known. */
  thickCloud?: number | null
  /** The hour's layers (0–100 each), when the forecast gives them. */
  hour?: Pick<HourPoint, 'cloudLow' | 'cloudMid' | 'cloudHigh'>
}

/**
 * The cover of each layer (0–1). From the forecast's layers when it gives all three, scaled so together they make the
 * shown cover (which the satellite may have corrected for now). Else a marked fallback: from the thick (low + mid) cloud
 * and the cover (the rest is high cloud), or from the cover alone (all of it counted thick). Thick cloud is split evenly
 * between low and mid.
 */
export function layerCovers(input: CoverInput): { covers: Covers; source: WorldSources['cloudLayers'] } {
  const total = clamp01(input.cloudCover / 100)
  const { cloudLow, cloudMid, cloudHigh } = input.hour ?? {}
  if (cloudLow != null && cloudMid != null && cloudHigh != null) {
    const covers = { low: cloudLow / 100, mid: cloudMid / 100, high: cloudHigh / 100 }
    const union = unionOf(covers)
    if (union <= 0) return { covers: { low: 0, mid: 0, high: 0 }, source: 'forecast' }
    // Scale each layer's clear share so the union is the shown total: (1 − c)^k for all three.
    const k = Math.log1p(-Math.min(total, 0.98)) / Math.log1p(-Math.min(union, 0.9999))
    const closure = smoothstep(0.98, 1, total)
    const scale = (c: number) => c > 0 ? 1 - (1 - c) ** k * (1 - closure) : 0
    return { covers: { low: scale(covers.low), mid: scale(covers.mid), high: scale(covers.high) }, source: 'forecast' }
  }
  const knownThick = input.thickCloud != null
  const thick = clamp01(Math.min(knownThick ? input.thickCloud! / 100 : total, total))
  const high = thick >= 1 ? 0 : clamp01(1 - (1 - total) / (1 - thick))
  const each = 1 - Math.sqrt(1 - thick)
  return { covers: { low: each, mid: each, high }, source: knownThick ? 'thickCloud' : 'cover' }
}

/** Banks round the whole horizon at full cover; fewer as the cover falls (the same first ones stay). */
const MAX_BANKS: Record<CloudLevel, number> = { low: 16, mid: 12, high: 8 }
/**
 * Altitudes (deg) the banks are spread over: the whole dome a cloud deck shows from below, with more of them low, where
 * the far part of the deck is foreshortened and crowds together (stage C6; C0 spread them by distance, 4–80 km, which put
 * every bank within ~30° of the horizon and left the sky overhead bare whatever the cover).
 */
const ALTITUDE: [number, number] = [3, 78]
/** Steeper than 1: more banks low. */
const ALTITUDE_BIAS = 1.7
/** No bank is wider than this (deg): an overhead cloud is large, but one bank never spans the sky. */
const MAX_W = 80
const WIDTH_KM: Record<CloudLevel, [number, number]> = { low: [1.5, 5], mid: [3, 10], high: [6, 20] }
const ASPECT: Record<CloudLevel, number> = { low: 0.35, mid: 0.25, high: 0.15 }
const PUFFS: Record<CloudLevel, [number, number]> = { low: [4, 8], mid: [3, 6], high: [2, 3] }
const BASE_M: Record<CloudLevel, number> = { low: 1500, mid: 4000, high: 9000 }
/** The golden angle: any first n banks are spread round the circle, so a growing cover fills it evenly. */
const GOLDEN = 137.508
/** Assumed height of a cloud the satellite saw (as `cloudSeen.ts`). */
const SEEN_KM = 2
/** Scene px/s of drift per km/h of wind across (as the WebGL air's cloud drift). */
const DRIFT_PER_KMH = 0.4

const DEG = 180 / Math.PI
const between = (r: number, [a, b]: [number, number]) => a + (b - a) * r

/**
 * The low cloud's base (m above the place): the lifting condensation level, ~125 m per °C between the air and its dew
 * point (Magnus), 300–2500 m; 1500 m when the humidity is unknown.
 */
export function lowBaseM(temperature: number, humidity: number | null): number {
  if (humidity === null || humidity <= 0) return BASE_M.low
  const a = 17.62
  const b = 243.12
  const gamma = Math.log(humidity / 100) + (a * temperature) / (b + temperature)
  const dewPoint = (b * gamma) / (a - gamma)
  return Math.min(2500, Math.max(300, 125 * (temperature - dewPoint)))
}

/** The seeded banks of one layer: positions by the place and the bank's index only, so they never jump. */
export function banksOf(placeId: string, level: CloudLevel, cover: number, baseM: number): CloudBank[] {
  // The living light: the newest bank gathers as the cover grows (its `share`), so a cover read between forecast hours
  // never pops a bank in or out (the count was rounded, from 5 % cover).
  // Bank i stands whole where the rounded count had it (cover × max ≥ i + ½) and gathers over the unit below; the first
  // gathers from 3 % to 7 % cover (it came at 5 %).
  const exact = cover * MAX_BANKS[level]
  const shareOf = (i: number) => Math.min(1, Math.max(0, i === 0 ? (cover - 0.03) / 0.04 : exact - i + 0.5))
  let count = 0
  while (count < MAX_BANKS[level] && shareOf(count) > 0) count++
  return Array.from({ length: count }, (_, i) => {
    const id = `${level}:${i}`
    const seed = hashId(`${placeId}:cloud:${id}`)
    const r = seeded(seed)
    const azimuth = (i * GOLDEN + (r() - 0.5) * 20 + 360) % 360
    // The bank's place on the dome is seeded; its distance follows from the deck's height (so a change of hour that
    // moves the base moves the bank nearer or farther, never across the sky).
    const altitude = between(r() ** ALTITUDE_BIAS, ALTITUDE)
    const distanceKm = baseM / 1000 / Math.tan(altitude / DEG)
    const widthKm = between(r(), WIDTH_KM[level])
    const w = Math.min(MAX_W, 2 * Math.atan(widthKm / 2 / distanceKm) * DEG)
    return {
      id, azimuth, distanceKm, seed, altitude,
      w, h: w * ASPECT[level],
      puffs: Math.round(between(r(), PUFFS[level])),
      ...(shareOf(i) < 1 ? { share: Math.round(shareOf(i) * 32) / 32 } : {}),
    }
  })
}

/** The single clouds the satellite sees near the place, as low banks marked `seen`. */
export function seenBanks(list: readonly WeightedSighting[]): CloudBank[] {
  return list.map((s, i) => {
    const distanceKm = Math.max(1, s.distanceKm)
    const w = 2 * Math.atan(s.widthKm / 2 / distanceKm) * DEG
    return { id: `seen:${i}`, azimuth: s.azimuth, altitude: Math.atan(SEEN_KM / distanceKm) * DEG, w, h: w * ASPECT.low,
      distanceKm, puffs: 5, seed: hashId(`seen:${s.azimuth.toFixed(1)}:${s.distanceKm.toFixed(1)}`), seen: true }
  })
}

export interface CloudInput {
  placeId: string
  covers: Covers
  temperature: number
  humidity: number | null
  sunAltitude: number
  wind: Wind
  /** Which layer rains (`rainingLevel`), or null. */
  raining: CloudLevel | null
  seen: readonly WeightedSighting[]
}

/** The three layers, low to high: banks, base, drift with the wind at their height, lit undersides at a low sun. */
export function cloudLayers(input: CloudInput): CloudLayer[] {
  const { covers, wind, sunAltitude } = input
  return LEVELS.map((level, index) => {
    const baseM = level === 'low' ? lowBaseM(input.temperature, input.humidity) : BASE_M[level]
    const banks = banksOf(input.placeId, level, covers[level], baseM)
    if (level === 'low') banks.push(...seenBanks(input.seen))
    // Higher cloud keeps the sun's light a little longer after sunset (and catches it earlier before sunrise).
    const lit = (1 - smoothstep(2, 12, sunAltitude)) * smoothstep(-1 - 2 * index, 0, sunAltitude)
    return {
      level, cover: covers[level], baseM, banks,
      drift: wind.aloftAcross[level] * wind.aloft[level] * 3.6 * DRIFT_PER_KMH,
      litUnderside: lit,
      rains: input.raining === level,
    }
  })
}
