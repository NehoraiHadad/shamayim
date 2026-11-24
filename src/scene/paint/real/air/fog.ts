import { smoothstep } from '../../../../domain/smoothstep'
import type { LayerOf, MistBandDesc } from '../../../model/types'
import { detailTile, tileAt } from '../../shared/base/detailTile'
import type { Ctx2D, PaintEnv } from '../../shared/base/hand'

/*
 * Fog as a volume: the model's band, its own density a row (`fogRows`), gathered along the row into soft uneven banks. Far
 * banks, up by its top, lie small and flat; near ones, at its foot, are large. The tops of the banks waver and take a breath
 * of light. Zero-mean along every row, so the fog stands as high and hides as much as the model's. A raster on a scratch
 * sheet, periodic over the tile; seeded by the band, so nothing moves but by the drift.
 */

/** Raster px per land px: a bank's finest wisp still spans several. */
const RASTER = 0.5
const NOISE_SEED = 4253, OCTAVES = 2
/** Banks round the tile and tile px down, far and near; whole counts, so the tile meets itself. */
const FAR = { round: 2, down: 36 }, NEAR = { round: 1, down: 90 }
/** The share of the room a row has for uneven density that its banks take. */
const UNEVEN = 0.5
/** How far the top wavers, against its own fade. */
const WAVER = 0.5
/** A bank's lit top and shaded hollow, against its colour; read over this many raster rows. */
const RELIEF = 0.07, LIFT = 2
/** The bounds cut a tall fade short: the fog starts from nothing over these px. */
const START = 9

/** A puff's mean along the tile, at `k` of its half height: its soft disc's chord. */
function puffShare(k: number): number {
  if (k >= 1) return 0
  const half = Math.sqrt(1 - k * k)
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const r = Math.hypot(k, half * ((i + 0.5) / 4))
    sum += r < 0.55 ? 1 - (0.45 * r) / 0.55 : (0.55 * (1 - r)) / 0.45
  }
  return (half * 2 * sum) / 4
}

/** The band's mean alpha on each raster row of the bounds: its body, and the puffs along its top. */
export function fogRows(band: MistBandDesc, bounds: { y: number; w: number; h: number }, rows: number): Float32Array {
  const from = band.top - band.fade, span = Math.max(1, band.bottom - from)
  const knee = Math.min(0.95, (2 * band.fade) / span)
  return Float32Array.from({ length: rows }, (_, j) => {
    const y = bounds.y + ((j + 0.5) * bounds.h) / rows
    const s = Math.min(1, Math.max(0, (y - from) / span))
    let clear = 1 - band.alpha * (s < knee ? (0.75 * s) / knee : 0.75 + (0.25 * (s - knee)) / (1 - knee))
    for (const p of band.puffs) {
      clear *= 1 - band.alpha * p.alpha * 0.8 * puffShare(Math.abs(y - p.y) / p.ry) * Math.min(1, p.rx / bounds.w)
    }
    return (1 - clear) * smoothstep(bounds.y, bounds.y + START, y)
  })
}

const at = (rows: Float32Array, j: number) => {
  const a = Math.min(rows.length - 1, Math.max(0, j)), i = Math.floor(a)
  return rows[i] + (rows[Math.min(rows.length - 1, i + 1)] - rows[i]) * (a - i)
}

/** The uneven density (-1 to 1) of the raster's pixels: the far banks up by the top, the near ones at the foot. */
function banks(cols: number, rows: number, y0: number, band: MistBandDesc, seed: number): Float32Array {
  const tile = detailTile(NOISE_SEED, OCTAVES), out = new Float32Array(cols * rows)
  const ou = seed * 0.618, ov = seed * 0.317
  for (let j = 0, n = 0; j < rows; j++) {
    const y = y0 + (j + 0.5) / RASTER, near = smoothstep(0.1, 0.9, (y - band.top) / Math.max(1, band.bottom - band.top))
    for (let i = 0; i < cols; i++, n++) {
      const u = (i + 0.5) / cols
      const far = near < 1 ? tileAt(tile, u * FAR.round + ou, y / FAR.down + ov) : 0
      const close = near > 0 ? tileAt(tile, u * NEAR.round + ov, y / NEAR.down + ou) : 0
      out[n] = Math.min(1, Math.max(-1, 2.6 * (far * (1 - near) + close * near - 0.5)))
    }
  }
  return out
}

function bank(ctx: Ctx2D, band: MistBandDesc, bounds: { x: number; y: number; w: number; h: number }, env: PaintEnv) {
  const cols = Math.max(8, Math.round(bounds.w * RASTER)), rows = Math.max(2, Math.ceil(bounds.h * RASTER))
  // One column over on each side, the far side's own: the stretch meets itself at the tile's edge.
  const sheet = env.canvas(cols + 2, rows)
  const image = sheet.ctx.createImageData(cols + 2, rows)
  const seed = band.puffs.reduce((sum, p) => sum + p.rx, 0) % 1
  const mean = fogRows(band, bounds, rows)
  const uneven = banks(cols, rows, bounds.y, band, seed)
  const long = detailTile(NOISE_SEED, 1)
  const waver = Float32Array.from({ length: cols }, (_, i) =>
    6 * WAVER * (tileAt(long, (i + 0.5) / cols + seed, seed) - 0.5) * band.fade * RASTER)
  const topRow = (band.top - bounds.y) * RASTER, fade = Math.max(1, band.fade * RASTER)
  const line = new Float32Array(cols)
  for (let j = 0; j < rows; j++) {
    const share = Math.exp(-Math.max(0, j - topRow) / (2 * fade))
    let sum = 0
    for (let i = 0; i < cols; i++) {
      const a = at(mean, j + waver[i] * share)
      sum += line[i] = a + UNEVEN * uneven[j * cols + i] * Math.min(a, 1 - a)
    }
    const even = sum > 0 ? (mean[j] * cols) / sum : 0
    for (let i = -1; i <= cols; i++) {
      const c = (i + cols) % cols, n = j * cols + c, o = (j * (cols + 2) + i + 1) * 4
      const shade = 255 * (1 + RELIEF * (uneven[n] - uneven[Math.max(c, n - LIFT * cols)]))
      for (let k = 0; k < 3; k++) image.data[o + k] = band.rgb[k] * shade
      image.data[o + 3] = 255 * line[c] * even
    }
  }
  sheet.ctx.putImageData(image, 0, 0)
  const px = bounds.w / cols
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(sheet.canvas as CanvasImageSource, bounds.x - px, bounds.y, bounds.w + 2 * px, bounds.h)
}

/** Mist and fog lying in the low ground, over a tile the compositor drifts. */
export function paintFog(ctx: Ctx2D, desc: LayerOf<'mist'>, env: PaintEnv): void {
  for (const band of desc.bands) bank(ctx, band, desc.bounds, env)
}
