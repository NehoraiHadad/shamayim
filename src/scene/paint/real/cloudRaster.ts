import type { LayerOf } from '../../model/types'
import { throughAir } from '../shared/cloud/throughAir'
import { detailTilePx, drawnAlpha } from './cloudLook'
import { detailTile, tileAt } from '../shared/base/detailTile'
import type { PaintEnv } from '../shared/base/hand'

/*
 * The softened sheet grid laid on a raster in sky px, each pixel given the fine detail a grid ray cannot carry (the first
 * WebGL sky's per-pixel noise): a seeded, periodic fractal tile, scaled with perspective (`detailTilePx`) so the far deck
 * keeps finer grain. Pure: the grid, the seed and the size give the same pixels; the tile is a function of its seed.
 */

/** Raster px per sky px: half resolution, then stretched; the finest detail octave still spans several px. */
const RASTER = 0.5

interface SheetGrid { buf: Float32Array; cols: number; rows: number; spacing: readonly number[] }

/** The grid as a raster `width` × `height` sky px on a scratch surface, its pixels' centres on the grid's edges. */
export function rasterise(env: PaintEnv, grid: SheetGrid, width: number, height: number, open: number, seed: number,
  air: Pick<LayerOf<'cloudSheet'>, 'ys' | 'through'>) {
  const w = Math.ceil(width * RASTER) + 1, h = Math.ceil(height * RASTER) + 1
  const scratch = env.canvas(w, h)
  const image = scratch.ctx.createImageData(w, h)
  const tile = open ? detailTile(seed) : null
  let v = 0
  for (let j = 0; j < h; j++) {
    const gy = (j * (grid.rows - 1)) / (h - 1)
    const tilePx = detailTilePx(grid.spacing[Math.round(gy)])
    if (j) v += 1 / (RASTER * tilePx)
    for (let i = 0; i < w; i++) {
      const gx = (i * (grid.cols - 1)) / (w - 1)
      const detail = tile ? tileAt(tile, (i / RASTER - width / 2) / tilePx, v) : 0.5
      writePixel(image.data, (j * w + i) * 4, grid, gx, gy, (alpha) => drawnAlpha(alpha, detail, open))
    }
  }
  throughAir(image.data, w, h, air)
  scratch.ctx.putImageData(image, 0, 0)
  return { canvas: scratch.canvas, w, h }
}

/** One pixel: the grid's premultiplied texels bilinear at (gx, gy), straight-alpha bytes, alpha drawn through `drawn`. */
function writePixel(out: Uint8ClampedArray, at: number, { buf, cols, rows }: SheetGrid, gx: number, gy: number,
  drawn: (alpha: number) => number) {
  const c = Math.min(cols - 2, Math.floor(gx)), r = Math.min(rows - 2, Math.floor(gy))
  const tx = gx - c, ty = gy - r
  const n00 = (r * cols + c) * 4, n10 = n00 + 4, n01 = n00 + cols * 4, n11 = n01 + 4
  const texel = (k: number) => {
    const top = buf[n00 + k] + (buf[n10 + k] - buf[n00 + k]) * tx
    return top + (buf[n01 + k] + (buf[n11 + k] - buf[n01 + k]) * tx - top) * ty
  }
  const alpha = texel(3)
  for (let k = 0; k < 3; k++) out[at + k] = byte(alpha > 0 ? texel(k) / alpha : 0)
  out[at + 3] = byte(alpha > 0 ? drawn(alpha) : 0)
}

const byte = (c: number) => Math.round(Math.min(1, Math.max(0, c)) * 255)
