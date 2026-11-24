import { cloudLight } from './light'
import { RASTER, type SheetField } from './sheetField'
import type { CloudPoint } from './tone'

/** Nearer than this (px) to the light's own place it comes from behind a cloud, not from a side. */
const BEFORE = 70

/** Raster cells per cell of the grid the light is worked out on (light is soft), and the one whose place stands for them. */
const CELL = 3, MIDDLE = 1
/** What of its heads' sides a broad body keeps. */
const HEADS_KEPT = 0.3

/** The mean of each `CELL`² cells of a w × h grid, on the light's grid. */
function coarse(full: Float32Array, w: number, h: number, cw: number, ch: number): Float32Array {
  const out = new Float32Array(cw * ch)
  for (let j = 0, p = 0; j < h; j++) {
    const row = Math.floor(j / CELL) * cw
    for (let i = 0; i < w; i++, p++) out[row + Math.floor(i / CELL)] += full[p]
  }
  const cells = (n: number, all: number) => Math.max(1, Math.min(CELL, all - n * CELL))
  for (let j = 0, n = 0; j < ch; j++) for (let i = 0; i < cw; i++, n++) out[n] /= cells(j, h) * cells(i, w)
  return out
}

/** The mean shade of a mass's own light: the palest one's, and what it keeps of the model's mean tone. */
const PALEST = 0.07, KEPT = 0.24

/** The mean shade the model's tone leaves to the light. */
function meanShade({ tone, thick }: SheetField): number {
  let sum = 0, mass = 0
  for (let p = 0; p < thick.length; p++) {
    sum += tone[p] * thick[p]
    mass += thick[p]
  }
  return mass ? PALEST + (KEPT * sum) / mass : 0
}

/** Writes the light on a sheet's pixel into a point. `from`: the light's place, raster px. */
export function sheetLight(field: SheetField, from: { x: number; y: number }, beam: number) {
  const { w, h } = field, cw = Math.max(2, Math.ceil(w / CELL)), ch = Math.max(2, Math.ceil(h / CELL))
  const thick = coarse(field.thick, w, h, cw, ch), scale = Float32Array.from({ length: ch }, (_, j) => field.scale[Math.min(h - 1, CELL * j + MIDDLE)])
  const { light, shade } = cloudLight({ w: cw, h: ch, k: RASTER / CELL, thick, scale, calm: field.calm }, { x: from.x / CELL, y: from.y / CELL }, beam, meanShade(field))
  const relief = reliefOf(field, thick, cw, ch, from)
  return (i: number, j: number, p: number, point: CloudPoint) => {
    const x = Math.min(cw - 1.001, Math.max(0, (i - MIDDLE) / CELL)), y = Math.min(ch - 1.001, Math.max(0, (j - MIDDLE) / CELL))
    const c = x | 0, r = y | 0, tx = x - c, ty = y - r, n = r * cw + c, m = n + cw
    const at = (g: Float32Array) => {
      const top = g[n] + (g[n + 1] - g[n]) * tx
      return top + (g[m] + (g[m + 1] - g[m]) * tx - top) * ty
    }
    point.light = at(light)
    point.shade = at(shade)
    point.relief = at(relief)
    point.thick = field.thick[p]
    point.wall = field.wall[p]
    point.flat = field.flat[p]
  }
}

/** How far the heads face away from the light, on the light's grid. */
function reliefOf({ w, bend, scale, grain, calm }: SheetField, thick: Float32Array, cw: number, ch: number, from: { x: number; y: number }): Float32Array {
  const out = new Float32Array(cw * ch), middle = (w - 1) / 2, before = BEFORE * RASTER, kept = 1 + (HEADS_KEPT - 1) * calm
  for (let j = 0, n = 0; j < ch; j++) {
    const row = Math.min(scale.length - 1, CELL * j + MIDDLE)
    grain.row(scale[row])
    for (let i = 0; i < cw; i++, n++) {
      if (!thick[n]) continue
      const x = Math.min(w - 1, CELL * i + MIDDLE), dx = from.x - x, dy = from.y - row, far = Math.max(before, Math.sqrt(dx * dx + dy * dy))
      out[n] = kept * grain.relief((x - middle) / RASTER, row / RASTER, dx / far, dy / far, bend[row * w + x])
    }
  }
  return out
}
