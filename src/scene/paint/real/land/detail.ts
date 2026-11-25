import type { LayerOf } from '../../../model/types'
import { rng } from '../../shared/base/core'
import type { Ctx2D, PaintEnv, Scratch } from '../../shared/base/hand'

/*
 * The ground's detail finer than its texels, at the screen's own pixel: what a photograph of a hillside holds under its
 * patches of soil and scrub (pebbles lit on top with a shadow under, the stubble of dry grass, the grit between). The
 * ground's colour and light are the texels'; this only scales their value up and down a little, each channel alike (an
 * overlay of grey: on a ground under half its range, `2·B·S`, a share of its own value), so it takes their colour and
 * their light, as strong in the evening's dark as at noon, and it is laid flat as the ground lies (wider than tall).
 *
 * Two tiles, built once a page (one seed): a fine one (a device px and two) over the whole plane, and a coarser one (two to three
 * device px: the grit and stones the eye sees nearest) that comes in toward the plane's foot. Each is drawn at one device
 * px to its px, unsmoothed, anchored to the scene (it never crawls), under the plane's outline mask. Pure: a seed's tile
 * is a function of it, and of nothing else (`TILE` and the constants here), so it is cached by the seed.
 */

/** A tile's side (device px). */
const TILE = 256
/** The strength of each tile (its darkest and lightest px scale the ground's value by 1 ∓ this), by plane: haze and distance quiet it. */
const FINE = 0.16, COARSE = 0.18
const PLANE: Record<LayerOf<'plane'>['plane'], number> = { back: 0.35, far: 0.65, near: 1 }
/** Where down the plane (of its height) the coarse tile starts, and where it is whole; the strips it is laid in. */
const COARSE_FROM = 0.3, COARSE_TO = 0.9, STRIPS = 10
/** Stones per 1000 device px² in each tile: a dark px under a lit one. */
const STONES = { fine: 6, coarse: 4 } as const

/** The tiles' seed: one grit for every plane and place (it is the ground's grain, not its patches), so a page builds each once. */
const SEED = 7121

const tiles = new Map<string, Scratch>()

/**
 * One octave of periodic value noise added into `v` (the tile, row by row): random values (−1…1) on a lattice of cells
 * `cx` × `cy` px, eased between (smoothstep), times `amp`.
 */
function octave(v: Float32Array, r: () => number, cx: number, cy: number, amp: number) {
  const nx = TILE / cx, ny = TILE / cy, lattice = Float32Array.from({ length: nx * ny }, () => 2 * r() - 1)
  const ease = (t: number) => t * t * (3 - 2 * t)
  // The ease across a cell, the same in every cell; a row's lattice values eased down to it, then across.
  const across = Float32Array.from({ length: cx }, (_, x) => ease(x / cx)), row = new Float32Array(nx)
  for (let y = 0; y < TILE; y++) {
    const j0 = Math.floor(y / cy), j1 = (j0 + 1) % ny, fy = ease(y / cy - j0)
    for (let i = 0; i < nx; i++) row[i] = lattice[j0 * nx + i] + (lattice[j1 * nx + i] - lattice[j0 * nx + i]) * fy
    for (let i = 0, o = y * TILE; i < nx; i++) {
      const a = row[i], b = row[(i + 1) % nx]
      for (let x = 0; x < cx; x++, o++) v[o] += amp * (a + (b - a) * across[x])
    }
  }
}

/**
 * One tile: a field of grit (value noise at the tile's scale, flattened) and stones (a dark spot with a lit cap). Its
 * px are grey about 128, the overlay's neutral: what is above lightens, what is below darkens.
 */
function tileOf(env: PaintEnv, seed: number, coarse: boolean): Scratch {
  const key = `${seed}:${coarse ? 'c' : 'f'}`
  const held = tiles.get(key)
  if (held) return held
  const v = new Float32Array(TILE * TILE), s = seed + (coarse ? 911 : 577), r = rng(s * 7 + 1)
  // Grit: two octaves of value noise on lattices that divide the tile (so it repeats with no seam), flat as the ground
  // lies under the eye (twice as wide as tall): the fine tile's cells 4 × 2 and 2 × 1 device px, the coarse tile's twice that.
  const k = coarse ? 2 : 1
  octave(v, r, 4 * k, 2 * k, 0.85)
  octave(v, r, 2 * k, 1 * k, 0.45)
  // Stones: each a lit cap over its shadow, a px or two across, wider than tall.
  const count = Math.round((coarse ? STONES.coarse : STONES.fine) * TILE * TILE / 1000)
  const put = (x: number, y: number, by: number) => {
    const n = ((y + TILE) % TILE) * TILE + ((x + TILE) % TILE)
    v[n] = Math.max(-1, Math.min(1, v[n] + by))
  }
  for (let stone = 0; stone < count; stone++) {
    const x = Math.floor(r() * TILE), y = Math.floor(r() * TILE), wide = 1 + Math.floor(r() * (coarse ? 3 : 2)), tall = coarse && r() < 0.4 ? 2 : 1
    const dark = 0.45 + 0.5 * r(), lit = r() < 0.65 ? 0.45 + 0.5 * r() : 0
    for (let i = 0; i < wide; i++) {
      for (let j = 0; j < tall; j++) put(x + i, y + j, -dark)
      if (lit) put(x + i, y - 1, lit)
    }
  }
  const tile = env.canvas(TILE, TILE), image = tile.ctx.createImageData(TILE, TILE), data = image.data
  for (let n = 0, o = 0; n < v.length; n++, o += 4) {
    const g = Math.round(128 + 127 * Math.max(-1, Math.min(1, v[n])))
    data[o] = data[o + 1] = data[o + 2] = g
    data[o + 3] = 255
  }
  tile.ctx.putImageData(image, 0, 0)
  if (tiles.size >= 8) tiles.delete(tiles.keys().next().value!)
  tiles.set(key, tile)
  return tile
}

/**
 * Lays the ground's detail over a plane's lit ground on `target` (the light canvas or its shade twin), in the current
 * pose, before the plane's outline mask. `amount` scales it (the hand's grain, the dark of the night).
 */
export function paintGroundDetail(target: Ctx2D, desc: LayerOf<'plane'>, env: PaintEnv, amount: number): void {
  const strength = amount * PLANE[desc.plane]
  if (strength <= 0) return
  const m = target.getTransform(), { x, y, w, h } = desc.bounds
  if (!m) return
  // One device px to a tile px, anchored to the scene's origin.
  const lay = (tile: Scratch, alpha: number, y0: number, y1: number) => {
    const pattern = target.createPattern(tile.canvas as CanvasImageSource, 'repeat')
    if (!pattern || alpha <= 0) return
    target.save()
    target.setTransform(1, 0, 0, 1, Math.round(m.e), Math.round(m.f))
    target.imageSmoothingEnabled = false
    target.globalCompositeOperation = 'overlay'
    target.globalAlpha = Math.min(1, alpha)
    target.fillStyle = pattern
    const top = Math.floor(y0 * m.d), bottom = Math.ceil(y1 * m.d)
    target.fillRect(Math.floor(x * m.a), top, Math.ceil(w * m.a) + 1, bottom - top)
    target.restore()
  }
  // The tiles are built at full strength (±1/2 about the neutral, a scale of 1 ± 1); the plane's share of it is the alpha.
  lay(tileOf(env, SEED, false), strength * FINE, y, y + h)
  if (desc.plane !== 'near') return
  const coarse = tileOf(env, SEED, true)
  for (let k = 0; k < STRIPS; k++) {
    const v0 = COARSE_FROM + (1 - COARSE_FROM) * k / STRIPS, v1 = COARSE_FROM + (1 - COARSE_FROM) * (k + 1) / STRIPS
    const mid = (v0 + v1) / 2, ramp = Math.min(1, Math.max(0, (mid - COARSE_FROM) / (COARSE_TO - COARSE_FROM)))
    lay(coarse, strength * COARSE * ramp * ramp * (3 - 2 * ramp), y + h * v0, y + h * v1)
  }
}
