import { smoothstep } from '../../../domain/smoothstep'
import { rng } from '../core'
import { fieldAt, type SheetField } from './sheetField'

/*
 * The heads a cumulus is drawn of (v1b's `cloudBank`: round puffs laid back to front, each lit on its top): puffs of several
 * sizes, every one inside the model's own coverage (its radius is no more than its middle's depth in the mass), the large
 * ones through the mass, the small ones along its rim. So the outline is a cauliflower's, whatever the cells' own, and no
 * gap is closed. A mass's middle is cloud even between two heads; its base is cut flat. Pure: the field and the seed.
 */

/** The heads' radii at the zenith (px), large to small; the least (px). */
const RADII = [52, 32, 19, 12, 7.5, 4.8, 3], LEAST = 1.6
/** The step between their middles, and its jitter, against the radius. */
const STEP = 0.85, JITTER = 0.8
/** How deep a head's middle lies against its radius, at least and (but the largest) at most; how its radius varies; the
 *  share of their places left empty; their least radius against the mass's thickness there: a large mass grows in large
 *  heads (up to this thickness, px). */
const DEEP_MIN = 0.8, DEEP_MAX = 1.5, VARY = 0.4, EMPTY = 0.3, OF_THICK = 0.3, THICK_MAX = 45
/** How far short of its mass's edge a head may stop (of its depth): the outline is never one line. */
const SHORT = 0.25
/** How much calmer the heads' light is in the middle of a mass than along its rim. */
const CALM = 0.65
/** A head's fade at its rim (px; at most of its radius), and what is left of it at its foot: the next one in front begins. */
const FADE = 3, FADE_OF = 0.4, FOOT_LEFT = 0.1
/** A head's light: its lit top, and its foot's shade against it. */
const FOOT = -0.75
/** The share of a mass's thickness from which it is cloud between the heads, and where fully. */
const MIDDLE = 0.22, WHOLE = 0.4
/** The base's fade (px), the shade on it, and the share of the mass's thickness that shade reaches up. */
const BASE_FADE = 2.5, BASE_SHADE = 0.45, BASE_UP = 0.6

/** Per raster px: how much of it the heads cover (0…1) and their light (about −0.75…1). */
export interface Heads { cover: Float32Array; light: Float32Array }

interface Head { x: number; y: number; r: number; lit: number }

/** The heads over a raster w × h, `sizeAt` a head's size at a height (0 top … 1 far edge). */
export function paintHeads(f: SheetField, w: number, h: number, seed: number, sizeAt: (down: number) => number): Heads {
  const cover = new Float32Array(w * h), light = new Float32Array(w * h)
  const px = (w - 1) / f.width, py = (h - 1) / f.height
  for (const { x, y, r, lit } of placed(f, seed, sizeAt)) {
    const rim = Math.min(FADE, FADE_OF * r) / r
    const j0 = Math.max(0, Math.ceil((y - r) * py)), j1 = Math.min(h - 1, Math.floor((y + r) * py))
    const i0 = Math.max(0, Math.ceil((x - r) * px)), i1 = Math.min(w - 1, Math.floor((x + r) * px))
    for (let j = j0; j <= j1; j++) {
      const dy = (j / py - y) / r
      const left = 1 - (1 - FOOT_LEFT) * smoothstep(-0.35, 1, dy), facing = dy < 0 ? -dy * lit : FOOT * dy
      for (let i = i0; i <= i1; i++) {
        const dx = (i / px - x) / r, d = Math.sqrt(dx * dx + dy * dy)
        if (d >= 1) continue
        const n = j * w + i, on = smoothstep(1, 1 - rim, d)
        cover[n] = Math.max(cover[n], on)
        light[n] += (facing - light[n]) * on * left
      }
    }
  }
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const gx = (i * (f.cols - 1)) / (w - 1), gy = (j * (f.rows - 1)) / (h - 1), n = j * w + i
      const depth = fieldAt(f.depth, f.cols, f.rows, gx, gy)
      if (depth <= 0) continue
      const thick = Math.min(THICK_MAX, Math.max(0.5, fieldAt(f.thick, f.cols, f.rows, gx, gy)))
      const deep = depth / thick, base = fieldAt(f.base, f.cols, f.rows, gx, gy)
      cover[n] = Math.max(cover[n], smoothstep(MIDDLE, WHOLE, deep)) * smoothstep(0, Math.min(BASE_FADE, FADE_OF * thick), base)
      light[n] = light[n] * (1 - CALM * smoothstep(0.3, 1.3, deep)) - BASE_SHADE * smoothstep(BASE_UP * thick, 0, base)
    }
  }
  return { cover, light }
}

/** The heads, back to front: the lower a head's middle, the nearer it lies over the others. */
function placed(f: SheetField, seed: number, sizeAt: (down: number) => number): Head[] {
  const heads: Head[] = []
  RADII.forEach((radius, level) => {
    const random = rng(seed + level)
    for (let y = 0; y < f.height;) {
      const full = Math.max(LEAST, radius * sizeAt(y / f.height)), step = STEP * full
      for (let x = random() * step; x < f.width; x += step) {
        const hx = x + (random() - 0.5) * JITTER * step, hy = y + (random() - 0.5) * JITTER * step
        const vary = 1 + VARY * (2 * random() - 1), lit = 0.5 + 0.5 * random(), short = 1 - SHORT * random()
        const gx = (hx / f.width) * (f.cols - 1), gy = (hy / f.height) * (f.rows - 1)
        const depth = fieldAt(f.depth, f.cols, f.rows, gx, gy)
        if (depth > 0 && level > 1 && full * vary < OF_THICK * Math.min(THICK_MAX, fieldAt(f.thick, f.cols, f.rows, gx, gy))) continue
        if (random() < EMPTY || depth < DEEP_MIN * full || (level > 0 && depth > DEEP_MAX * full)) continue
        heads.push({ x: hx, y: hy, r: Math.min(depth * short, full * vary), lit })
      }
      y += step
    }
  })
  return heads.sort((a, b) => a.y - b.y)
}
