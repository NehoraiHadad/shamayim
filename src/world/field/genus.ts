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

/** Derive the form weights and the two genus-specific weather gates. */
export function formOf(input: FieldInput, covers: Covers): Record<Lattice, LayerForm> {
  const code = input.weatherCode
  const conv = code >= 95 && code <= 99 ? 1 : code >= 80 && code <= 82 ? 0.6 : 0
  const strat = unit(smoothstep(0.5, 0.75, covers.low) * (1 - conv)
    + 0.5 * (1 - smoothstep(-6, 10, input.sunAltitude)))
  const form = {
    conv, strat, sheet: smoothstep(0.65, 0.9, covers.mid), veil: smoothstep(0.55, 0.85, covers.high),
    stratus: strat > 0.9 && input.lowBaseKm < 0.3 && input.wind10.speedKmh < 14.4,
    nimbostratus: code >= 61 && code <= 65 && covers.low * covers.mid > 0.5,
  }
  return { low: form, tower: form, mid: form, high: form }
}

/** Assign genus by static rank so a life-cycle change alone keeps the form. */
export function genusOf(lattice: Lattice, form: LayerForm, rank: number): Genus {
  switch (lattice) {
    case 'low': return form.stratus ? 'st' : rank < form.strat ? 'sc' : 'cu'
    case 'tower': return rank < smoothstep(0.6, 1, form.conv) ? 'cb' : 'cg'
    case 'mid': return form.nimbostratus ? 'ns' : rank < form.sheet ? 'as' : 'ac'
    case 'high': return rank < form.veil ? 'cs' : 'ci'
  }
}
