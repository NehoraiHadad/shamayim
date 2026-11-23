import type { LayerOf } from '../../model/types'
import { deckOpenness } from '../cloudLook'
import { resampleRows, ROW } from '../cloudSheet'
import { soften } from '../soften'

/*
 * A field layer's sheet as the drawn hand reads it: the model's own alpha and tone on an even grid, softened into calm
 * masses (wider than tall, less with distance), and a broader copy of the same alpha for each mass's large light and
 * shade. Where the cloud is and how much of it stays the model's. Pure: the desc alone.
 */

/** Softening against the local row spacing, and at most (sky px): the near masses' and their broad light's. */
const SOFT = 0.5, SOFT_MAX = 9, BROAD = 1.5, BROAD_MAX = 26
/** Softening across against down: masses spread along the horizon, as v1b's banks do. */
const STRETCH = 2.2
/** Rows either side a row's spacing is eased over. */
const EASE = 14

export interface SheetField {
  cols: number; rows: number; x0: number; y0: number; width: number; height: number
  /** 0 closed … 1 open (`deckOpenness`). */
  open: number
  /** Per cell: the soft alpha, the tone over it, and the broad alpha. */
  alpha: Float32Array; tone: Float32Array; broad: Float32Array
  /** Per row: the model's row spacing there (px), its perspective. */
  spacing: number[]
}

export function sheetField(desc: LayerOf<'cloudSheet'>): SheetField | null {
  const { xs, ys } = desc, cols = xs.length
  const height = ys[ys.length - 1] - ys[0], width = xs[cols - 1] - xs[0]
  if (cols < 2 || ys.length < 2 || height <= 0 || !desc.alpha.some((a) => a > 0)) return null
  const rows = Math.max(2, Math.ceil(height / ROW) + 1)
  const texels = Array.from({ length: cols * ys.length }, (_, n) => {
    const a = Math.min(1, Math.max(0, desc.alpha[n] ?? 0))
    return [(desc.tone[n] ?? 0) * a, a, 0, a]
  })
  const { buf, spacing: stepped } = resampleRows(texels, cols, ys, rows)
  const spacing = eased(stepped)
  const colPx = width / (cols - 1), rowPx = height / (rows - 1)
  const blur = (share: number, max: number) => {
    const down = spacing.map((s) => Math.min(max, share * s))
    soften(buf, cols, rows, down.map((r) => (STRETCH * r) / colPx), down.map((r) => r / rowPx))
  }
  const open = deckOpenness(desc)
  blur(SOFT, SOFT_MAX)
  const n = cols * rows
  const alpha = new Float32Array(n), tone = new Float32Array(n), broad = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    alpha[i] = buf[i * 4 + 3]
    tone[i] = alpha[i] > 1e-3 ? buf[i * 4] / alpha[i] : 0
  }
  blur(BROAD, BROAD_MAX)
  for (let i = 0; i < n; i++) broad[i] = buf[i * 4 + 3]
  return { cols, rows, x0: xs[0], y0: ys[0], width, height, open, alpha, tone, broad, spacing }
}

/** The rows' spacings eased over their neighbours: the model's steps would show as seams across the sky. */
function eased(steps: readonly number[]): number[] {
  return steps.map((_, n) => {
    const near = steps.slice(Math.max(0, n - EASE), n + EASE + 1)
    return near.reduce((sum, s) => sum + s, 0) / near.length
  })
}

/** A grid of the field bilinear at (gx, gy) in cells. */
export function fieldAt(grid: Float32Array, cols: number, rows: number, gx: number, gy: number): number {
  const c = Math.min(cols - 2, Math.max(0, Math.floor(gx))), r = Math.min(rows - 2, Math.max(0, Math.floor(gy)))
  const tx = Math.min(1, gx - c), ty = Math.min(1, gy - r), n = r * cols + c
  const top = grid[n] + (grid[n + 1] - grid[n]) * tx
  const low = grid[n + cols] + (grid[n + cols + 1] - grid[n + cols]) * tx
  return top + (low - top) * ty
}
