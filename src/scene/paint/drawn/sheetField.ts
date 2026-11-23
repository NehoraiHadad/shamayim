import { smoothstep } from '../../../domain/smoothstep'
import type { LayerOf } from '../../model/types'
import { deckOpenness, openAlpha, softRadii } from '../cloudLook'
import { resampleRows, ROW } from '../cloudSheet'
import { soften } from '../soften'
import { overBases } from './massBase'
import { massForm } from './massForm'

/*
 * A field layer's sheet as the drawn hand reads it: the model's own alpha and tone on an even grid, softened as the
 * real hand's, how deep in its mass each point lies (`massForm`: off the model's own edge, so every gap stays), and how near
 * its mass's top or foot, for the large light and shade. Where the cloud is and how much stays the model's. Pure: the desc.
 */

/** The large light's softening against the local row spacing, and at most (sky px). */
const SOFT = 0.5, SOFT_MAX = 9
/** How far into a mass its top's light and its foot's shade reach, against the local row spacing. */
const DEEP = 4.5
/** What a clear row still carries on of it (one mass does not shade the next), and the alpha that carries it whole. */
const GAP = 0.7, SOLID = 0.6
/** Softening across against down: masses spread along the horizon, as v1b's banks do. */
const STRETCH = 1.5
/** The height (of the sheet's, from its far edge) up to which a base is seen from the side, and from which only from below. */
const SIDE_ON = 0.55, BELOW = 1.1
/** The outline's rounding against the real hand's softening, and at least (px). */
const ROUND = 1.3, ROUND_MIN = 1.2
/** Rows either side a row's spacing is eased over. */
const EASE = 14

export interface SheetField {
  cols: number; rows: number; x0: number; y0: number; width: number; height: number
  /** 0 closed … 1 open (`deckOpenness`). */
  open: number
  /** Per cell: the alpha, the tone over it, the towns' light on it by night, and its place in its mass (1 top … −1 foot). */
  alpha: Float32Array; tone: Float32Array; city: Float32Array; side: Float32Array
  /** Per cell: how deep in its mass it lies (px, below 0 in a gap) and the mass's thickness there; how far over its base. */
  depth: Float32Array; thick: Float32Array; base: Float32Array
  /** Per row: the model's row spacing there (px), its perspective. */
  spacing: number[]
}

export function sheetField(desc: LayerOf<'cloudSheet'>): SheetField | null {
  const { xs, ys } = desc, cols = xs.length
  const height = ys[ys.length - 1] - ys[0], width = xs[cols - 1] - xs[0]
  if (cols < 2 || ys.length < 2 || height <= 0 || !desc.alpha.some((a) => a > 0)) return null
  const rows = Math.max(2, Math.ceil(height / ROW) + 1)
  const open = deckOpenness(desc)
  const texels = Array.from({ length: cols * ys.length }, (_, n) => {
    const a = openAlpha(Math.min(1, Math.max(0, desc.alpha[n] ?? 0)), open)
    return [(desc.tone[n] ?? 0) * a, (desc.city?.weight[n] ?? 0) * a, 0, a]
  })
  const { buf, spacing: stepped } = resampleRows(texels, cols, ys, rows)
  const spacing = eased(stepped).map(least)
  const colPx = width / (cols - 1), rowPx = height / (rows - 1)
  const n = cols * rows
  const raw = new Float32Array(n).map((_, k) => buf[k * 4 + 3])
  const wide = new Float32Array(buf), down = spacing.map((s) => Math.min(SOFT_MAX, SOFT * s))
  soften(wide, cols, rows, down.map((r) => (STRETCH * r) / colPx), down.map((r) => r / rowPx))
  const radii = spacing.map(softRadii)
  soften(buf, cols, rows, radii.map(([across]) => across / colPx), radii.map(([, r]) => r / rowPx))
  const alpha = new Float32Array(n), tone = new Float32Array(n), city = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    alpha[i] = buf[i * 4 + 3]
    if (alpha[i] > 1e-3) {
      tone[i] = buf[i * 4] / alpha[i]
      city[i] = buf[i * 4 + 1] / alpha[i]
    }
  }
  const side = sides(wide.filter((_, k) => k % 4 === 3), cols, spacing.map((s) => Math.exp(-rowPx / (DEEP * s))))
  const grid = { cols, rows, colPx, rowPx }, form = massForm(raw, grid, radii.map(([, r]) => Math.max(ROUND_MIN, ROUND * r)))
  const base = overBases(form, grid, spacing.map((_, r) => 1 - smoothstep(SIDE_ON, BELOW, 1 - r / (rows - 1))))
  return { cols, rows, x0: xs[0], y0: ys[0], width, height, open, alpha, tone, city, side, spacing, base, ...form }
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

/** A row's spacing, no wider than any row's over it: the sheet's one wide last row is its far edge, not near. */
const least = (_: number, n: number, all: readonly number[]) => Math.min(...all.slice(0, n + 1))

/** A grid of the field bilinear at (gx, gy) in cells. */
export function fieldAt(grid: Float32Array, cols: number, rows: number, gx: number, gy: number): number {
  const c = Math.min(cols - 2, Math.max(0, Math.floor(gx))), r = Math.min(rows - 2, Math.max(0, Math.floor(gy)))
  const tx = Math.min(1, gx - c), ty = Math.min(1, gy - r), n = r * cols + c
  const top = grid[n] + (grid[n + 1] - grid[n]) * tx
  const low = grid[n + cols] + (grid[n + cols + 1] - grid[n + cols]) * tx
  return top + (low - top) * ty
}
