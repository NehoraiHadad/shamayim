import { minutesBetweenLocal } from '../domain/minutes'
import type { HourPoint, LocalTime } from '../domain/types'
import { smoothstep } from './ridgeLighting'
import type { WorldSources } from './types'

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
  /** Reported horizontal visibility (km, before PM10 aerosol capping). */
  visibilityKm: number
  /** Where `visibilityKm` came from (`chooseVisibility`): only measured/forecast/forced visibility drives vis-based fog. */
  visibilitySource: WorldSources['visibility']
  /** WMO weather code (45/48 count as data fog when no visibility is reported). */
  weatherCode: number
  /** Dry mineral dust (`air.dust`): dust is never water mist. */
  dust: boolean
  /** Rain rate (mm/h), 0 when dry. */
  rainRateMmH: number
  /** Raw low cloud cover (< 2 km, 0–100), null when unknown. */
  lowCloudPct: number | null
  /** Raw mid cloud cover (2–6 km, 0–100), null when unknown. */
  midCloudPct: number | null
  /** Thick/total cloud fallback (0–100) for longwave blocking when both raw low and mid layers are unknown. */
  thickCloudPct?: number | null
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

/** Whether the visibility came from measured/forecast data rather than a humidity guess or clean-air default. */
export const isDataVisibility = (source: WorldSources['visibility']): boolean =>
  source === 'current' || source === 'hour' || source === 'forced'

const WIND_CALM: readonly [number, number] = [3, 7]
const SUN_BURN: readonly [number, number] = [2, 26]
const WARM_BURN: readonly [number, number] = [0.5, 4.5]
const FADE_START_MINUTES = 10 * 60
const WINDOW_MINUTES = 12 * 60
const EDGE_PENALTY_C = 15

/**
 * Lowest hourly temperature (°C) in the 12 h up to `at`, or null when no hourly samples fall in that window.
 * Samples near the 12 h edge fade out continuously (+15 °C over 10–12 h) and cooling between consecutive hours is
 * interpolated at `at`, so there is no step at hh:00 / hh:01.
 */
export function nightMinimum(hours: readonly Pick<HourPoint, 'time' | 'temperature'>[], at: LocalTime): number | null {
  let min = Infinity
  for (let i = 0; i < hours.length; i++) {
    const h = hours[i]
    if (!Number.isFinite(h.temperature)) continue
    const age = minutesBetweenLocal(h.time, at)
    if (age >= 0 && age <= WINDOW_MINUTES) {
      const effective = h.temperature + EDGE_PENALTY_C * smoothstep(FADE_START_MINUTES, WINDOW_MINUTES, age)
      if (effective < min) min = effective
    }
    const next = hours[i + 1]
    if (age > 0 && age < 60 && next && Number.isFinite(next.temperature) && minutesBetweenLocal(h.time, next.time) === 60) {
      const interp = h.temperature + (next.temperature - h.temperature) * (age / 60)
      if (interp < min) min = interp
    }
  }
  return Number.isFinite(min) ? min : null
}

/**
 * Mist state (0–1) from the shown air, wind, raw low/mid cloud, sun altitude/side and 12 h minimum temperature.
 * Dust always yields zero mist.
 */
export function mistOf(input: MistInput): Mist {
  if (input.dust) return NO_MIST
  const dataVis = isDataVisibility(input.visibilitySource)
  const rh = input.humidity
  const droplet = rh == null ? 1 : smoothstep(70, 90, rh)

  // Potential for shallow radiation mist: near-saturated screen air, or reported visibility down below 10 km with droplets.
  const damp = rh == null ? 0 : smoothstep(84, 99, rh)
  const visPotential = dataVis ? smoothstep(10, 1.5, input.visibilityKm) * droplet : 0
  const potential = Math.max(damp, visPotential)

  // Radiation mist burns off on the morning side, stays 0 after solar noon while the sun is up, and reforms through civil
  // twilight (0° to −6°). Overcast low/mid cloud stops nocturnal longwave cooling.
  const calm = 1 - smoothstep(WIND_CALM[0], WIND_CALM[1], input.windMs)
  const sunFactor = input.sunRising
    ? (input.sunAltitude <= 0 ? 1 : 1 - smoothstep(SUN_BURN[0], SUN_BURN[1], input.sunAltitude))
    : smoothstep(0, -6, input.sunAltitude)
  const warmBurn = input.nightMinTemp == null ? 1 : 1 - smoothstep(WARM_BURN[0], WARM_BURN[1], input.temperature - input.nightMinTemp)
  const low = input.lowCloudPct == null ? null : input.lowCloudPct / 100
  const mid = input.midCloudPct == null ? null : input.midCloudPct / 100
  const lowMid = low != null || mid != null ? Math.max(low ?? 0, mid ?? 0)
    : input.thickCloudPct != null ? input.thickCloudPct / 100 : 0
  const clearSky = 1 - 0.9 * smoothstep(0.4, 0.9, lowMid)
  const radiation = potential * calm * sunFactor * warmBurn * clearSky

  // Persistent mist: reported low visibility (or fog weather code 45/48 when visibility is absent), rain in damp air,
  // or a raw low-cloud marine stratus deck trapping moisture.
  const visFog = dataVis ? smoothstep(6, 1.5, input.visibilityKm) * droplet : 0
  const codeFog = !dataVis && (input.weatherCode === 45 || input.weatherCode === 48) ? 0.8 * droplet : 0
  const fog = Math.max(visFog, codeFog)
  const rainMist = rh == null ? 0 : smoothstep(0.2, 2, input.rainRateMmH) * smoothstep(75, 92, rh)
  const marine = input.lowCloudPct == null || rh == null ? 0
    : smoothstep(70, 95, input.lowCloudPct) * smoothstep(85, 97, rh)
  const persistent = Math.max(fog, rainMist, marine)

  return { radiation, fog, persistent, amount: Math.max(radiation, persistent) }
}
