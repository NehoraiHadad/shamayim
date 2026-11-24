import { smoothstep } from '../../domain/smoothstep'
import { CORE_LEAK } from './cloudSprite'
import { mixSrgb } from './tone'
import type { LayerOf, RGB } from './types'

/** Share of clear nodes over which a low or mid sheet opens, from overcast to broken. */
export function deckOpenness(desc: LayerOf<'cloudSheet'>): number {
  if (desc.lattice === 'high') return 0
  const count = desc.xs.length * desc.ys.length
  let clear = 0
  for (let n = 0; n < count; n++) if ((desc.alpha[n] ?? 0) < 0.05) clear++
  return smoothstep(0.05, 0.15, clear / count)
}

/** Illustration's lit caps: daylight highlights are up to 55% closer to white. */
export function whitened(lit: RGB): RGB {
  return mixSrgb(lit, [1, 1, 1], 0.55 * smoothstep(0.55, 0.85, Math.min(...lit)))
}

/** Illustration's near-opaque core and rounded thin edge. Edge is the resolved billow mask. */
export const roundedSheetAlpha = (a: number, edge: number, open: number): number =>
  a + open * (0.94 * edge * a ** 0.55 - a)

/** Rounded silhouette, widened on the underside and in front of more air. */
export function roundedSheetEdge(a: number, head: number, part: number, rise: number, air: number): number {
  const soft = air + 0.27 + (0.08 - 0.27) * smoothstep(-0.2, 0.2, rise)
  return smoothstep(0.4 - soft, 0.4 + soft, a + head * part)
}

/** Photographic veil: the open deck's thin edges transmit more than its dense core. */
export const veiledSheetAlpha = (a: number, open: number): number => a + open * ((1 - CORE_LEAK) * a ** 1.6 - a)

/** Photographic grain moves the half-thick alpha most, then softens the faint rim. */
export function grainedSheetAlpha(alpha: number, detail: number, open: number): number {
  if (!open) return alpha
  const grained = Math.min(1, Math.max(0, alpha + open * 1.4 * (detail - 0.55) * 4 * alpha * (1 - alpha)))
  return grained * (1 + open * (smoothstep(0, 0.3, grained) - 1))
}

export const brightestCloud = ({ body, shade, lit }: { body: RGB; shade: RGB; lit: RGB }): RGB =>
  [Math.max(body[0], shade[0], lit[0]), Math.max(body[1], shade[1], lit[1]), Math.max(body[2], shade[2], lit[2])]

/** Upper painter endpoints before aerosol transmission, including peak billows and grain. */
export function sheetPaintBound(sheet: Pick<LayerOf<'cloudSheet'>, 'lattice' | 'body' | 'shade' | 'lit'>) {
  const bright = brightestCloud({ ...sheet, lit: sheet.lattice === 'high' ? sheet.lit : whitened(sheet.lit) })
  return { bright, alpha: (a: number) => {
    if (sheet.lattice === 'high') return a
    // Billow height is at most 0.6 + 0.5 × 2, small billows at most 1.
    const head = 0.85 * 1.6 + 0.34, part = 4 * a * (1 - a)
    const edge = Math.max(roundedSheetEdge(a, head, part, 1, 0), roundedSheetEdge(a, head, part, -1, 0.12))
    // Bound every openness. A photographic veil can only reduce the raw alpha
    // before the grain, and the maximum positive grain uses full openness.
    return Math.max(a, roundedSheetAlpha(a, edge, 1), grainedSheetAlpha(a, 1, 1))
  } }
}
