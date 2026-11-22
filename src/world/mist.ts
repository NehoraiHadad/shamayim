import { addMinutes, minutesBetweenLocal } from '../domain/minutes'
import type { HourPoint, LocalTime } from '../domain/types'
import { smoothstep } from './ridgeLighting'

/**
 * Shallow mist and fog (0–1): separated into nocturnal radiation mist that forms in calm damp air and burns off after
 * sunrise, and persistent mist sustained by the weather itself (low reported visibility, rain, or a damp marine stratus
 * deck). Pure: no clock, no randomness.
 */
export interface Mist {
  /** Valley/ground mist from nocturnal radiative cooling, burning off on the morning side (0–1). */
  radiation: number
  /** Data-driven fog (reported low visibility, or fog codes 45/48 with no visibility), droplet-gated (0–1). */
  fog: number
  /** Mist or fog sustained by the weather itself: data fog, rain in damp air, or a damp low-cloud marine deck (0–1). */
  persistent: number
  /** Combined mist strength (0–1): max(radiation, persistent). */
  amount: number
}

export interface MistInput {
  /** Relative humidity (%), null when unknown. */
  humidity: number | null
  /** Fraction of the weather blend supported by reported humidity. */
  humidityWeight: number
  /** Blended horizontal visibility (km, before PM10 aerosol capping). */
  visibilityKm: number
  /** Fraction supported by measured, forecast or forced visibility. */
  visibilityWeight: number
  /** Fraction reporting WMO fog (45/48) without a visibility reading. */
  fogCodeWeight: number
  /** Mineral dust share, from clear air (0) to full mist suppression (1). */
  dustWeight: number
  /** Rain rate (mm/h), 0 when dry. */
  rainRateMmH: number
  /** Raw low cloud cover (< 2 km, 0–100), with zero evidence when unknown. */
  lowCloudPct: number
  /** Low+mid overlap (0–100), with thick/total cover as the fallback. */
  blockingCloudPct: number
  /** Total cloud cover (0–100), the cap on the low+mid union; null when unknown. */
  totalCloudPct?: number | null
  /** 10 m wind speed (m/s). */
  windMs: number
  /** True solar altitude (deg); <= 0 below the horizon. */
  sunAltitude: number
  /** True east of the meridian (morning, hour angle < 0); false after solar noon. */
  sunRising: boolean
  /** Shown air temperature (°C). */
  temperature: number
  /** Lowest hourly temperature (°C) in the 12 h up to the shown time; null if unknown. */
  nightMinTemp: number | null
}

/** No mist: used in dry air, dust, or when mist context is omitted. */
export const NO_MIST: Mist = { radiation: 0, fog: 0, persistent: 0, amount: 0 }

export const isFogCode = (code: number): boolean => code === 45 || code === 48

/** Random overlap of the raw low and mid layers, as in Open-Meteo's thick-cover mapping. */
export function blockingCloudCover(low: number | null | undefined, mid: number | null | undefined, fallback: number): number {
  if (low == null && mid == null) return fallback
  const clear = (cover: number | null | undefined) => 1 - Math.min(100, Math.max(0, cover ?? 0)) / 100
  return 100 * (1 - clear(low) * clear(mid))
}

const WIND_CALM: readonly [number, number] = [3, 7]
const SUN_BURN: readonly [number, number] = [2, 26]
const WARM_BURN: readonly [number, number] = [0.5, 4.5]
const FADE_START_MINUTES = 9 * 60
const WINDOW_MINUTES = 12 * 60

/** The hourly temperature at `at` (°C), read between the hour and the next; null when the hours do not cover it. */
function temperatureAt(hours: readonly Pick<HourPoint, 'time' | 'temperature'>[], at: LocalTime): number | null {
  for (let i = 0; i < hours.length; i++) {
    const h = hours[i], age = minutesBetweenLocal(h.time, at)
    if (age < 0 || age >= 60 || !Number.isFinite(h.temperature)) continue
    const next = hours[i + 1]
    if (age === 0 || !next || !Number.isFinite(next.temperature) || minutesBetweenLocal(h.time, next.time) !== 60) return h.temperature
    return h.temperature + (next.temperature - h.temperature) * (age / 60)
  }
  return null
}

/**
 * Lowest temperature (°C) in the 12 h up to `at`, or null when no hourly samples fall in that window. A sample aging out
 * (9–12 h) is blended toward the temperature now before it leaves, so the minimum (and the burn-off it drives) moves
 * smoothly at any temperature swing: no step and no sudden rise when a cold sample expires.
 */
export function nightMinimum(hours: readonly Pick<HourPoint, 'time' | 'temperature'>[], at: LocalTime,
  now = temperatureAt(hours, at)): number | null {
  let min = now ?? Infinity
  const cutoff = addMinutes(at, -WINDOW_MINUTES)
  for (const h of hours) {
    if (h.time < cutoff || h.time > at || !Number.isFinite(h.temperature)) continue
    const age = minutesBetweenLocal(h.time, at)
    const keep = 1 - smoothstep(FADE_START_MINUTES, WINDOW_MINUTES, age)
    min = Math.min(min, now == null ? h.temperature : h.temperature * keep + now * (1 - keep))
  }
  return Number.isFinite(min) ? min : null
}

/**
 * Mist state (0–1) from the shown air, wind, raw low/mid cloud, sun altitude/side and 12 h minimum temperature.
 * Full dust yields zero mist.
 */
export function mistOf(input: MistInput): Mist {
  const clearShare = 1 - input.dustWeight
  if (clearShare === 0) return NO_MIST
  const rh = input.humidity ?? 0
  const knownRh = input.humidityWeight
  const droplet = 1 - knownRh * (1 - smoothstep(70, 90, rh))

  // Potential for shallow radiation mist: near-saturated screen air, or reported visibility down below 10 km with droplets.
  const damp = knownRh * smoothstep(84, 99, rh)
  const visPotential = input.visibilityWeight * smoothstep(10, 1.5, input.visibilityKm) * droplet
  const potential = Math.max(damp, visPotential)

  // Radiation mist burns off on the morning side, stays 0 after solar noon while the sun is up, and reforms through civil
  // twilight (0° to −6°). Overcast low/mid cloud stops nocturnal longwave cooling.
  const calm = 1 - smoothstep(WIND_CALM[0], WIND_CALM[1], input.windMs)
  const sunFactor = input.sunRising
    ? (input.sunAltitude <= 0 ? 1 : 1 - smoothstep(SUN_BURN[0], SUN_BURN[1], input.sunAltitude))
    : smoothstep(0, -6, input.sunAltitude)
  const warmBurn = input.nightMinTemp == null ? 1 : 1 - smoothstep(WARM_BURN[0], WARM_BURN[1], input.temperature - input.nightMinTemp)
  const lowMid = Math.min(input.blockingCloudPct, Math.max(0, input.totalCloudPct ?? 100)) / 100
  const clearSky = 1 - 0.9 * smoothstep(0.4, 0.9, lowMid)
  const radiation = potential * calm * sunFactor * warmBurn * clearSky * clearShare

  // Persistent mist: reported low visibility (or fog weather code 45/48 when visibility is absent), rain in damp air,
  // or a raw low-cloud marine stratus deck trapping moisture.
  const visFog = input.visibilityWeight * smoothstep(6, 1.5, input.visibilityKm)
  const codeFog = input.fogCodeWeight * 0.8
  const dataFog = (visFog + codeFog) * droplet
  const rainMist = knownRh * smoothstep(0.2, 2, input.rainRateMmH) * smoothstep(75, 92, rh)
  const marine = knownRh * smoothstep(70, 95, input.lowCloudPct) * smoothstep(85, 97, rh)
  const fog = dataFog * clearShare
  const persistent = Math.max(dataFog, rainMist, marine) * clearShare

  return { radiation, fog, persistent, amount: Math.max(radiation, persistent) }
}
