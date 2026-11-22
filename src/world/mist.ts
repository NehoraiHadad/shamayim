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
  /** Valley/ground mist from nocturnal radiative cooling, burning off as the sun climbs and the air warms (0–1). */
  radiation: number
  /** Mist or fog sustained by the weather itself: measured low visibility, rain, or a damp low-cloud deck (0–1). */
  persistent: number
  /** Combined mist strength (0–1): max(radiation, persistent). */
  amount: number
}

export interface MistInput {
  /** Relative humidity (%), null when unknown. */
  humidity: number | null
  /** Horizontal visibility (km, 1–40). */
  visibilityKm: number
  /** Where `visibilityKm` came from (`chooseVisibility`): only measured/forecast/forced visibility drives fog terms. */
  visibilitySource: WorldSources['visibility']
  /** Dry mineral dust (`air.dust`): dust is never water mist. */
  dust: boolean
  /** Rain rate (mm/h), 0 when dry. */
  rainRateMmH: number
  /** Low cloud cover (< 2 km, 0–100), null when unknown. */
  lowCloudPct: number | null
  /** 10 m wind speed (m/s). */
  windMs: number
  /** True solar altitude (deg); <= 0 below the horizon. */
  sunAltitude: number
  /** Shown air temperature (°C). */
  temperature: number
  /** Lowest hourly temperature (°C) in the 12 h up to the shown time; null if unknown. */
  nightMinTemp: number | null
}

/** No mist: used in dry air, dust, or when mist context is omitted. */
export const NO_MIST: Mist = { radiation: 0, persistent: 0, amount: 0 }

/** Whether the visibility came from measured/forecast data rather than a humidity guess or clean-air default. */
export const isDataVisibility = (source: WorldSources['visibility']): boolean =>
  source === 'current' || source === 'hour' || source === 'forced'

/**
 * Physical thresholds for radiation fog formation and burn-off (Stull, Boundary Layer Meteorology; WMO mist/fog scales):
 * - Humidity 84–99 % at 2 m screen height: valleys and radiating ground sit 1–3 °C colder than screen air, reaching
 *   saturation once 2 m RH climbs past ~84 %.
 * - Calm wind 3–7 m/s at 10 m: below ~3 m/s (Beaufort 2) nocturnal radiative cooling maintains a shallow surface
 *   inversion; mechanical shear mixing erodes it through 3–7 m/s (Beaufort 3–4) and prevents radiation fog by 7 m/s.
 * - Solar elevation 2–26°: below ~2° slant air mass (> 15) keeps net surface radiation negative; by ~26° (~2–2.5 h
 *   after sunrise in mid-latitudes) clear-sky insolation exceeds ~400 W/m², driving sensible heat flux that breaks the
 *   inversion.
 * - Warming 0.5–4.5 °C above the 12 h minimum: a 0.5 °C rise starts destabilising the shallowest skin layer; +4.5 °C
 *   lifts the condensation level clear of typical 100–200 m valley inversions and prevents false afternoon re-formation.
 * - Data visibility: WMO mist begins at ≤ 5 km and fog at < 1 km; 10→1.5 km provides nocturnal mist potential, while
 *   6→1.5 km drives persistent daytime fog.
 */
const WIND_CALM: readonly [number, number] = [3, 7]
const SUN_BURN: readonly [number, number] = [2, 26]
const WARM_BURN: readonly [number, number] = [0.5, 4.5]
const WINDOW_MINUTES = 12 * 60

/** Lowest hourly temperature (°C) in the 12 h up to `at`, or null when no hourly samples fall in that window. */
export function nightMinimum(hours: readonly Pick<HourPoint, 'time' | 'temperature'>[], at: LocalTime): number | null {
  let min = Infinity
  for (const h of hours) {
    const age = minutesBetweenLocal(h.time, at)
    if (age >= 0 && age <= WINDOW_MINUTES && Number.isFinite(h.temperature) && h.temperature < min) min = h.temperature
  }
  return Number.isFinite(min) ? min : null
}

/**
 * Mist state (0–1) from the shown air, wind, low cloud, sun altitude and 12 h minimum temperature.
 * Dust always yields zero mist.
 */
export function mistOf(input: MistInput): Mist {
  if (input.dust) return NO_MIST
  const dataVis = isDataVisibility(input.visibilitySource)
  const rh = input.humidity

  // Potential for shallow radiation mist: near-saturated screen air, or measured visibility down below 10 km.
  const damp = rh == null ? 0 : smoothstep(84, 99, rh)
  const visPotential = dataVis ? smoothstep(10, 1.5, input.visibilityKm) : 0
  const potential = Math.max(damp, visPotential)

  // Mechanical mixing at 10 m and diurnal inversion burn-off from solar heating + warming above the 12 h minimum.
  const calm = 1 - smoothstep(WIND_CALM[0], WIND_CALM[1], input.windMs)
  const sunBurn = input.sunAltitude <= 0 ? 1 : 1 - smoothstep(SUN_BURN[0], SUN_BURN[1], input.sunAltitude)
  const warmBurn = input.nightMinTemp == null ? 1 : 1 - smoothstep(WARM_BURN[0], WARM_BURN[1], input.temperature - input.nightMinTemp)
  const radiation = potential * calm * sunBurn * warmBurn

  // Persistent mist: reported low visibility, evaporation/spray in steady rain, or a capped damp marine stratus deck.
  const visFog = dataVis ? smoothstep(6, 1.5, input.visibilityKm) : 0
  // Steady rain (0.2–2 mm/h) creates sub-cloud evaporative mist even at midday, thickening with boundary-layer RH.
  const rainDamp = 0.45 + 0.35 * smoothstep(65, 95, rh ?? 80)
  const rainMist = smoothstep(0.2, 2, input.rainRateMmH) * rainDamp
  // Overcast low stratus (70–95 % below 2 km) blocks surface solar heating while trapping moisture (RH 85–97 %).
  const marine = input.lowCloudPct == null || rh == null ? 0
    : smoothstep(70, 95, input.lowCloudPct) * smoothstep(85, 97, rh)
  const persistent = Math.max(visFog, rainMist, marine)

  return { radiation, persistent, amount: Math.max(radiation, persistent) }
}
