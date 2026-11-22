import { wallMinutes } from './advect'
import type { Covers } from '../clouds'
import type { FieldInput, Genus, Lattice, LayerForm } from './types'

/** Genus base, thickness and width ranges in km, with extinction in km⁻¹. */
export const GENERA = {
  cu: { base: [0.3, 2.5], thickness: [0.15, 0.5], width: [0.25, 1], kappa: 30 },
  cg: { base: [0.3, 2.5], thickness: [2, 5], width: [1.5, 5], kappa: 30 },
  cb: { base: [0.3, 2.5], thickness: [8, 12], width: [5, 15], anvil: [20, 60], kappa: 30 },
  sc: { base: [0.4, 2], thickness: [0.2, 0.6], width: [0.6, 3], kappa: 40 },
  st: { base: [0.05, 0.6], thickness: [0.1, 0.5], width: null, kappa: 40 },
  ac: { base: [3, 5], thickness: [0.2, 0.6], width: [3, 15], elements: [0.1, 0.35], kappa: 15 },
  as: { base: [3, 5], thickness: [1, 3], width: null, kappa: 6 },
  ns: { base: [0.6, 2], thickness: [2, 5], width: null, kappa: 25 },
  ci: { base: [8, 12], thickness: [0.3, 1.5], width: [20, 60], crossWidth: [3, 10], kappa: 0.15 },
  cs: { base: [7, 10], thickness: [1, 2.5], width: null, kappa: 0.5 },
} as const

/** Cu mediocris thickness and width ranges in km. */
export const MEDIOCRIS = { thickness: [0.5, 1.5], width: [0.5, 2] } as const

/** Unit interval clamp. */
export function unit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/** Cubic interpolation across the given edges. */
export function smoothstep(lo: number, hi: number, value: number): number {
  const u = unit((value - lo) / (hi - lo))
  return u * u * (3 - 2 * u)
}

export function convectiveWeight(code: number) {
  return code >= 95 && code <= 99 ? 1 : code >= 80 && code <= 82 ? 0.6 : 0
}

/** Derive the form weights and the two genus-specific weather gates. */
export function formOf(input: Pick<FieldInput, 'weatherCode' | 'lowBaseKm' | 'sunAltitude' | 'rain'> & { wind10: { speedKmh: number } },
  covers: Covers, conv = convectiveWeight(input.weatherCode ?? 0), weather?: FieldInput['weather']): Record<Lattice, LayerForm> {
  const code = input.weatherCode ?? 0
  const wetMid = weather ? (input.rain?.midWeight ?? 0) * smoothstep(0, 0.2, input.rain?.rate ?? 0)
    : Number(input.rain?.level === 'mid' && input.rain.rate > 0)
  const frontalMid = (weather?.nimbostratus ?? Number(code >= 61 && code <= 65))
    * smoothstep(0.4, 0.6, covers.low * covers.mid)
  // Broken Sc already forms a deck around six tenths cover.
  const strat = unit(smoothstep(0.35, 0.6, covers.low) * (1 - conv)
    + 0.5 * (1 - smoothstep(-6, 10, input.sunAltitude)))
  return {
    low: { conv, strat, sheet: 0, veil: 0,
      stratus: smoothstep(0.85, 0.95, strat) * (1 - smoothstep(0.25, 0.35, input.lowBaseKm))
        * (1 - smoothstep(12.6, 16.2, input.wind10.speedKmh)) },
    tower: { conv, strat: 0, sheet: 0, veil: 0 },
    mid: { conv: 0, strat: 0, sheet: smoothstep(0.65, 0.9, covers.mid), veil: 0,
      nimbostratus: wetMid + (1 - wetMid) * frontalMid },
    high: { conv: 0, strat: 0, sheet: 0, veil: smoothstep(0.55, 0.85, covers.high) },
  }
}

/** Assign genus by an independent static draw so a life-cycle change alone keeps the form. */
export function genusOf(lattice: Lattice, form: LayerForm, ug: number, storm = smoothstep(0.6, 1, form.conv)): Genus {
  switch (lattice) {
    case 'low': return ug < (form.stratus ?? 0) ? 'st' : ug < form.strat ? 'sc' : 'cu'
    case 'tower': return ug < storm ? 'cb' : 'cg'
    case 'mid': return ug < (form.nimbostratus ?? 0) ? 'ns' : ug < form.sheet ? 'as' : 'ac'
    case 'high': return ug < form.veil ? 'cs' : 'ci'
  }
}

/** Forecast code weights transition from the previous hour to the next across each ±30 min window. */
export function convectiveAt(input: FieldInput) {
  const { hours, at } = input
  const fixed = (code: number) => ({ from: convectiveWeight(code), to: convectiveWeight(code), fraction: 0 })
  if (input.weatherForced) return fixed(input.weatherCode ?? 0)
  let forecast = convection.get(hours)
  if (!forecast) {
    const weights = hours.map(point => convectiveWeight(point.weatherCode))
    const indices = new Map<string, number>()
    hours.forEach(({ time }, index) => {
      const key = time.slice(0, 13)
      if (!indices.has(key)) indices.set(key, index)
    })
    const adjacent = hours.map((point, index) =>
      index > 0 && wallMinutes(point.time) - wallMinutes(hours[index - 1].time) === 60)
    convection.set(hours, forecast = { weights, indices, adjacent, active: weights.some(Boolean) })
  }
  const hour = forecast.indices.get(at.slice(0, 13))
  if (hour === undefined || !forecast.active) return fixed(input.weatherCode ?? 0)
  const minute = Number(at.slice(14, 16))
  const to = minute < 30 ? hour : hour + 1
  const { weights, adjacent } = forecast
  if (!adjacent[to]) return { from: weights[hour], to: weights[hour], fraction: 0 }
  return { from: weights[to - 1], to: weights[to], fraction: ((minute + 30) % 60) / 60 }
}

const convection = new WeakMap<FieldInput['hours'], {
  weights: number[]; indices: Map<string, number>; adjacent: boolean[]; active: boolean
}>()
