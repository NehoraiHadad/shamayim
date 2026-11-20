/*
 * Contrails by the Schmidt–Appleman criterion (C10; Schumann 1996, "On conditions for contrail formation from aircraft
 * exhausts", Meteorol. Z. 5). An exhaust plume mixes with the ambient air along a straight line in the (T, e) plane of
 * slope G; a contrail forms when that line crosses liquid saturation, i.e. when the ambient air is colder than the threshold
 * T_LC for its humidity. It persists (and spreads) when the ambient air is supersaturated over ice; otherwise it evaporates
 * within seconds to a minute, a short trail behind the plane.
 */

/** Exhaust water vapour per kg of kerosene, specific heat of air, ratio of molar masses, fuel heat and propulsion efficiency. */
const EI_H2O = 1.25
const CP = 1004
const EPSILON = 0.622
const Q = 43.2e6
const ETA = 0.3

/** Saturation vapour pressure over water (Pa), Sonntag 1990, T in K. */
export function satWater(T: number): number {
  return 100 * Math.exp(-6096.9385 / T + 16.635794 - 2.711193e-2 * T + 1.673952e-5 * T * T + 2.433502 * Math.log(T))
}

/** Saturation vapour pressure over ice (Pa), Sonntag 1990, T in K. */
export function satIce(T: number): number {
  return 100 * Math.exp(-6024.5282 / T + 24.7219 + 1.0613868e-2 * T - 1.3198825e-5 * T * T - 0.49382577 * Math.log(T))
}

/** The mixing line's slope G (Pa/K) at a pressure (Pa). */
export const mixingSlope = (pressurePa: number) => (EI_H2O * CP * pressurePa) / (EPSILON * Q * (1 - ETA))

/**
 * The threshold temperatures (K): `liquid` (T_LM) for air saturated over water, where the mixing line is tangent to the
 * saturation curve; `forHumidity` (T_LC) for air of relative humidity `rh` (0–1, over water), below which a contrail forms.
 */
export function thresholds(pressurePa: number, rh: number): { liquid: number; forHumidity: number } {
  const G = mixingSlope(pressurePa)
  const slope = (T: number) => (satWater(T + 0.01) - satWater(T - 0.01)) / 0.02
  let lo = 180, hi = 280
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (slope(mid) < G) lo = mid
    else hi = mid
  }
  const liquid = (lo + hi) / 2
  // T_LC: e_w(T_LM) − G (T_LM − T) = U e_w(T); the left side falls faster than the right as T drops below T_LM.
  const u = Math.min(1, Math.max(0, rh))
  if (u >= 1) return { liquid, forHumidity: liquid }
  const f = (T: number) => satWater(liquid) - G * (liquid - T) - u * satWater(T)
  lo = liquid - 40
  hi = liquid
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2
    if (f(mid) > 0) hi = mid
    else lo = mid
  }
  return { liquid, forHumidity: (lo + hi) / 2 }
}

export interface ContrailAir {
  /** A plane at this level leaves a contrail. */
  forms: boolean
  /** The air is supersaturated over ice: the trail persists and spreads into cirrus. */
  persists: boolean
  /** How far (K) the air is below the threshold (≤ 0: none); short trails grow with it. */
  margin: number
  /** Relative humidity over ice (0–…). */
  rhIce: number
}

/** The Schmidt–Appleman criterion for air at `temperatureC` (°C) and `rh` (%, over water) at `pressureHPa`. */
export function contrailAir(temperatureC: number, rh: number, pressureHPa = 250): ContrailAir {
  const T = temperatureC + 273.15
  const u = Math.max(0, rh) / 100
  const { forHumidity } = thresholds(pressureHPa * 100, u)
  const rhIce = (u * satWater(T)) / satIce(T)
  const margin = forHumidity - T
  const forms = margin > 0
  return { forms, persists: forms && rhIce >= 1, margin, rhIce }
}

/**
 * A climatological guess at the air at 250 hPa over the Levant when the forecast does not give it: the temperature by the
 * season (about −53 °C in January, −40 °C in July; the tropopause is high over the subtropics in summer), the humidity from
 * the high cloud the forecast does give (cirrus means the air there is near ice saturation), else a dry-ish 35 %.
 */
export function cruiseClimate(dayOfYear: number, highCover: number | null): { temperature: number; humidity: number } {
  const temperature = -46.5 - 6.5 * Math.cos((2 * Math.PI * (dayOfYear - 15)) / 365)
  const high = highCover ?? 0
  // Over water; ice saturation at −45 °C is ~65 % over water.
  const humidity = 30 + 45 * Math.min(1, high / 0.6)
  return { temperature, humidity }
}
