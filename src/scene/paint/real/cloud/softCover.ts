import type { LayerOf } from '../../../model/types'
import { soften } from '../../shared/base/soften'
import { resampleRows, ROW } from '../../shared/cloud/resampleRows'

/** Sky px over which a step of the model's rows is smoothed into a scale of their own; the least scale. */
const SMOOTH = 16, SMALLEST = 0.06
/** A cover's softness down against across: masses stretch along the horizon, as a deck seen at a slant does. */
const SOFT_DOWN = 0.5

/**
 * The model's uneven grid as a soft one on even rows, ROW px apart: [tone, source, towns' light] each times its cover, and
 * the cover, the quantities that interpolate without dark fringes. `soft`: how far it is spread (px overhead), less toward
 * the horizon, where the rows crowd: far rows stay small puffs.
 */
export function softCover(desc: LayerOf<'cloudSheet'>, soft: number) {
  const { xs, ys } = desc, cols = xs.length, span = ys[ys.length - 1] - ys[0]
  const texels = Array.from({ length: cols * ys.length }, (_, n) => {
    const a = Math.min(1, Math.max(0, desc.alpha[n] ?? 0))
    return [(desc.tone[n] ?? 0) * a, (desc.source?.[n] ?? 1) * a, (desc.city?.weight[n] ?? 0) * a, a]
  })
  const rows = Math.max(2, Math.ceil(span / ROW) + 1), { buf, spacing } = resampleRows(texels, cols, ys, rows)
  const wide = Math.max(...spacing), colPx = (xs[cols - 1] - xs[0]) / (cols - 1), rowPx = span / (rows - 1)
  const radius = spacing.map((s) => (soft * s) / wide)
  soften(buf, cols, rows, radius.map((r) => r / colPx), radius.map((r) => (SOFT_DOWN * r) / rowPx))
  return { buf, cols, rows, scale: rowScale(spacing.map((s) => Math.sqrt(s / wide))) }
}

/** Each row's scale by its spacing, smooth down the sky (the model's rows change spacing in steps). */
function rowScale(raw: readonly number[]): number[] {
  const reach = Math.round(SMOOTH / ROW)
  return raw.map((_, r) => {
    const near = raw.slice(Math.max(0, r - reach), r + reach + 1)
    return Math.max(SMALLEST, near.reduce((sum, s) => sum + s, 0) / near.length)
  })
}
