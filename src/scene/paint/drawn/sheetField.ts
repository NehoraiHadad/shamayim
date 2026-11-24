import type { LayerOf } from '../../model/types'
import { deckOpenness } from '../shared/cloud/deck'
import { resampleRows, ROW } from '../shared/cloud/resampleRows'
import { soften } from '../shared/base/soften'

/*
 * A field layer's sheet as the drawn hand reads it: the model's own alpha and tone on an even grid, softened into calm
 * masses (wider than tall, less with distance), and how near its own top or foot each part of a mass lies, for the mass's
 * large light and shade. Where the cloud is and how much of it stays the model's. Pure: the desc alone.
 */

/** Softening against the local row spacing, and at most (sky px). */
const SOFT = 0.5, SOFT_MAX = 9
/** How far into a mass its top's light and its foot's shade reach, against the local row spacing. */
const DEEP = 4.5
/** What a clear row still carries on of it (one mass does not shade the next), and the alpha that carries it whole. */
const GAP = 0.7, SOLID = 0.6
/** Softening across against down: masses spread along the horizon, as v1b's banks do. */
const STRETCH = 1.5
/** Rows either side a row's spacing is eased over. */
const EASE = 14

export interface SheetField {
  cols: number; rows: number; x0: number; y0: number; width: number; height: number
  /** 0 closed … 1 open (`deckOpenness`). */
  open: number
  /** Per cell: the soft alpha, the tone over it, the towns' light on it by night, and its place in its mass (1 top … −1 foot). */
  alpha: Float32Array; tone: Float32Array; city: Float32Array; side: Float32Array
  /** The light of a thick base against its mean, where the desc gives it. */
  source: Float32Array | null
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
    return [(desc.tone[n] ?? 0) * a, (desc.city?.weight[n] ?? 0) * a, (desc.source?.[n] ?? 1) * a, a]
  })
  const { buf, spacing: stepped } = resampleRows(texels, cols, ys, rows)
  const spacing = eased(stepped)
  const colPx = width / (cols - 1), rowPx = height / (rows - 1)
  const down = spacing.map((s) => Math.min(SOFT_MAX, SOFT * s))
  soften(buf, cols, rows, down.map((r) => (STRETCH * r) / colPx), down.map((r) => r / rowPx))
  const n = cols * rows
  const alpha = new Float32Array(n), tone = new Float32Array(n), city = new Float32Array(n), source = desc.source ? new Float32Array(n).fill(1) : null
  for (let i = 0; i < n; i++) {
    alpha[i] = buf[i * 4 + 3]
    if (alpha[i] > 1e-3) {
      tone[i] = buf[i * 4] / alpha[i]
      city[i] = buf[i * 4 + 1] / alpha[i]
      if (source) source[i] = buf[i * 4 + 2] / alpha[i]
    }
  }
  const side = sides(alpha, cols, spacing.map((s) => Math.exp(-rowPx / (DEEP * s))))
  return { cols, rows, x0: xs[0], y0: ys[0], width, height, open: deckOpenness(desc), alpha, tone, city, side, source, spacing }
}

/** Each part's place in its mass: the cloud under it against the cloud over it, the near weighing more (`keep` a row). */
function sides(alpha: Float32Array, cols: number, keep: readonly number[]): Float32Array {
  const over = new Float32Array(alpha), under = new Float32Array(alpha)
  const carried = (n: number) => keep[Math.floor(n / cols)] * Math.min(1, GAP + (1 - GAP) * alpha[n] / SOLID)
  for (let n = cols; n < over.length; n++) over[n] += carried(n - cols) * over[n - cols]
  for (let n = over.length - cols - 1; n >= 0; n--) under[n] += carried(n + cols) * under[n + cols]
  return over.map((o, n) => (under[n] - o) / (under[n] + o + 1e-3))
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
