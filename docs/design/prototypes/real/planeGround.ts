import { materialAt } from '../../../../src/scene/paint/shared/land/planeMaterial'
import type { PlaneTexelCtx } from '../../../../src/scene/paint/shared/land/planeTexel'
import { TEXEL } from '../../../../src/scene/model/planeBands'
import { noiseAt, placeOf, puffTile, wispTile } from './cloudNoise'

/*
 * The ground's own surface, seen at a slant and from afar: the model's palette where it lies, broken into patches that
 * lengthen across the slope, scrub that thins upward into specks, and a small relief the light rakes over. No blotches:
 * every scale shrinks toward the crest. Pure: the plane's texels, a place and a seed.
 */

/** A patch's width at the foot and at the crest (px), and how flat the slant makes it. */
const PATCH = [150, 46] as const, FLAT = 3.1
/** How far the patches move the reflectance; a scrub clump's darkening. */
const PATCHES = 0.3, SCRUB = 0.5
/** The share of the noise above which scrub stands. */
const BUSH = 0.66
/** How hard the light rakes the ground's swells, at a high sun and at a low one, and its scrub; the sun it leaves. */
const RELIEF = [1.1, 1.9] as const, BUSHES = 0.9, RAKED = [0.35, 1.45] as const

interface GroundPoint { rho: [number, number, number]; relief: number }

/** `lamp`: the sun's (else the moon's) place in sky px and its altitude, deg. */
export function planeGround(t: PlaneTexelCtx, lamp: { x: number; altitude: number }) {
  const side = Math.max(-1, Math.min(1, (lamp.x - t.bounds.x - t.bounds.w / 2) / 110))
  const raked = RELIEF[1] + (RELIEF[0] - RELIEF[1]) * Math.min(1, Math.max(0, lamp.altitude) / 50)
  // Grain off: the shared mottle and its dark flecks are what the surface here replaces.
  const plain: PlaneTexelCtx = { ...t, grainAmount: 0 }
  const from = placeOf(t.seed % 9973), wisp = wispTile(), puff = puffTile()
  const rough = Math.min(1, 0.4 + 3 * t.grainAmount)
  const out: GroundPoint = { rho: [0, 0, 0], relief: 1 }
  return (x: number, y: number): GroundPoint => {
    const i = Math.min(t.wPx - 1, Math.max(0, Math.floor((x - t.bounds.x) / TEXEL)))
    const tall = Math.max(1, t.footY[i] - t.crestY[i])
    const v = Math.min(1, Math.max(0, (y - t.crestY[i]) / tall))
    const u = Math.min(1, Math.max(0, (x - t.bounds.x) / Math.max(1, t.bounds.w)))
    materialAt(plain, x * 0.5, y * 0.5, u, v, out.rho)
    const near = v * v * (3 - 2 * v)
    const mix = (pick: (size: number) => number) => pick(PATCH[1]) * (1 - near) + pick(PATCH[0]) * near
    const ox = x - t.bounds.x + 900 * from.u, oy = (y - t.bounds.y) * FLAT + 900 * from.v
    const bend = noiseAt(wisp, ox / 260, oy / 260) - 0.5
    const read = (tile: Float32Array, rate: number, a = 0, b = 0) =>
      mix((size) => noiseAt(tile, ox * rate / size + 0.25 * bend + a, oy * rate / size + 0.25 * bend + b))
    const patch = read(wisp, 1) - 0.5, fine = read(wisp, 2.6) - 0.5
    const bushes = (a: number, b: number) => Math.max(0, read(puff, 1.7, a, b) - BUSH + 0.3 * patch) / (1 - BUSH) * rough
    const scrub = bushes(0, 0)
    const f = 1 + rough * (PATCHES * patch + 0.2 * fine)
    const dark = 1 - SCRUB * Math.min(1, scrub * 1.6)
    out.rho[0] = clamp(out.rho[0] * f * dark * (1 - 0.1 * scrub))
    out.rho[1] = clamp(out.rho[1] * f * (dark + 0.06 * scrub))
    out.rho[2] = clamp(out.rho[2] * f * dark)
    const swell = (a: number, b: number) => 0.8 * read(puff, 0.34, a, b) + 0.7 * read(puff, 0.6, 1.3 * a, 1.3 * b) + 0.4 * read(wisp, 1.4, 1.8 * a, 1.8 * b)
    const slope = raked * (swell(0, 0) - swell(0.04 * side, -0.05)) + BUSHES * (scrub - bushes(0.03 * side, -0.04))
    out.relief = Math.max(RAKED[0], Math.min(RAKED[1], 1 + rough * slope))
    return out
  }
}

const clamp = (c: number) => Math.min(1, Math.max(0, c))
