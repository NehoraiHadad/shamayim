import { SCENE_W } from './sceneBox'
import type { FarCities, FarPatch } from './types'

/** Strength steps of the existing built-share material. */
export const MASS_FROM = [0.03, 0.08, 0.16, 0.28, 0.45]
/** Half-pixel material rows, not building-height floors. */
export const ROWS = 2

export function farTownField(patches: readonly FarPatch[]) {
  const mass: FarCities['shapes']['mass'] = []
  // The field covers only the rows the towns stand in (from `r0`), a margin for the smoothing round them.
  const r0 = Math.max(0, Math.floor(Math.min(...patches.map((p) => p.top)) * ROWS) - 2)
  const cols = SCENE_W, rows = Math.max(1, Math.ceil(Math.max(...patches.map((p) => p.bottom)) * ROWS) + 2 - r0)
  const share = new Float32Array(cols * rows), kmShare = new Float32Array(cols * rows)
  const owner = new Int32Array(cols * rows).fill(-1), ownerShare = new Float32Array(cols * rows)
  for (const { left, right, top, bottom, km, built, townId } of patches) {
    for (let c = Math.max(0, Math.floor(left)); c < Math.min(cols, Math.ceil(right)); c++) {
      const across = Math.min(right, c + 1) - Math.max(left, c)
      for (let r = Math.max(0, Math.floor(top * ROWS) - r0); r < Math.min(rows, Math.ceil(bottom * ROWS) - r0); r++) {
        const down = Math.min(bottom * ROWS - r0, r + 1) - Math.max(top * ROWS - r0, r)
        const add = built * across * down
        share[r * cols + c] += add
        kmShare[r * cols + c] += add * km
        if (add > ownerShare[r * cols + c]) {
          ownerShare[r * cols + c] = add; owner[r * cols + c] = townId ?? -1
        }
      }
    }
  }
  // Mean distance where the share was laid (before smoothing spreads it), then a 1-2-1 pass across and down.
  const kmOf = new Float32Array(cols * rows)
  for (let i = 0; i < share.length; i++) kmOf[i] = share[i] > 0 ? kmShare[i] / share[i] : 0
  const smooth = (src: Float32Array, step: number, len: number): Float32Array => {
    const out = new Float32Array(src.length)
    for (let i = 0; i < src.length; i++) {
      const p = Math.floor(i / step) % len
      const prev = p > 0 ? src[i - step] : 0, next = p < len - 1 ? src[i + step] : 0
      out[i] = (prev + 2 * src[i] + next) / 4
    }
    return out
  }
  const field = smooth(smooth(share, 1, cols), cols, rows)
  // The distance a smoothed cell shows: its own, else its nearest laid neighbour's in the row or column.
  const indexAt = (c: number, r: number) => {
    for (let d = 0; d <= 2; d++) {
      for (const [dc, dr] of [[0, 0], [-d, 0], [d, 0], [0, -d], [0, d]]) {
        const cc = c + dc, rr = r + dr
        if (cc >= 0 && cc < cols && rr >= 0 && rr < rows && kmOf[rr * cols + cc] > 0) return rr * cols + cc
      }
    }
    return -1
  }
  for (let r = 0; r < rows; r++) {
    let run: { c0: number; step: number; km: number; band: number; townId?: number } | null = null
    const flush = (c: number) => {
      if (run) mass.push({ x: run.c0, y: (r + r0) / ROWS, w: c - run.c0, h: 1 / ROWS, km: run.km, step: run.step,
        townId: run.townId })
      run = null
    }
    for (let c = 0; c < cols; c++) {
      const v = field[r * cols + c]
      const step = MASS_FROM.findLastIndex((from) => v >= from)
      const index = step >= 0 ? indexAt(c, r) : -1
      const km = index >= 0 ? kmOf[index] : 0
      const townId = index >= 0 && owner[index] >= 0 ? owner[index] : undefined
      // A run keeps one step and one distance band (a tenth of the distance), so the air takes it as one.
      const band = km > 0 ? Math.round(Math.log(km) * 10) : -1
      if (run && (step !== run.step || band !== run.band || townId !== run.townId)) flush(c)
      if (step >= 0 && km > 0) run ??= { c0: c, step, km, band, townId }
    }
    flush(cols)
  }
  return { mass, cols, rows, r0, field }
}
