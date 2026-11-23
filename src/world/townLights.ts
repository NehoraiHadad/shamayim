import type { FarData } from '../data/city/farData'
import type { CloudLevel } from './types'
import { builtCells, type BuiltCell } from './builtCells'
import { evenAir, townAirOf, type TownAir } from './townAir'

/*
 * Where the towns' light comes from at night, from the far raster's built shares (the same cells the far towns are drawn
 * from): what lights a cloud base over any point round the place, and the lit air over each bearing (`townAir.ts`).
 * Static per place, worked when a night first asks: the hour, the lit windows, the cloud and the air weigh it
 * (`scene/model/cityLight.ts`).
 */

export interface TownLights {
  /** The built share of the ground (0–1) as the base of a cloud of `level` over (`e`, `n`) km sees it under itself. */
  under: (level: CloudLevel, e: number, n: number) => number
  air: () => TownAir
}

/** A low deck's horizon: no base further off is seen over eye level. */
const REACH_KM = 110
/**
 * The height (km) a level's base is lit from: its own (~1, 3, 8 km) and two more for the light scattered on its way up
 * and in the base, so a town stands on the base as a wide soft patch.
 */
const LIT_FROM: Record<CloudLevel, number> = { low: 3, mid: 5, high: 10 }
/** A base's light is worked on a square grid of this many steps to its height, from the ground within this many heights. */
const STEPS = 2, SEEN = 5
/** Without the raster: an `env.glow` of 40 is a wholly built plain (a metropolis's ~10 is a quarter built). */
const GLOW_OF_BUILT = 40

/** Each built cell's area shared between the grid's nodes round it. */
function groundGrid(cells: readonly BuiltCell[], step: number, half: number): Float32Array {
  const side = 2 * half + 1, out = new Float32Array(side * side)
  for (const { e, n, area } of cells) {
    const x = e / step + half, y = n / step + half, col = Math.floor(x), row = Math.floor(y), tx = x - col, ty = y - row
    const at = row * side + col
    out[at] += area * (1 - tx) * (1 - ty)
    out[at + 1] += area * tx * (1 - ty)
    out[at + side] += area * (1 - tx) * ty
    out[at + side + 1] += area * tx * ty
  }
  return out
}

/**
 * The light on a base `h` up, over any point: each built cell a Lambertian patch under a level base,
 * h² / (π (ρ² + h²)²) of its area, and a wholly built plain 1, so a base is lit by the ground within about its own height.
 */
function baseLight(cells: readonly BuiltCell[], h: number): (e: number, n: number) => number {
  const step = h / STEPS, reach = SEEN * STEPS, half = Math.ceil(REACH_KM / step) + reach + 1, side = 2 * half + 1
  const ground = groundGrid(cells, step, half), base = new Float32Array(side * side)
  const kernel: { by: number; share: number }[] = []
  let whole = 0
  for (let dr = -reach; dr <= reach; dr++) for (let dc = -reach; dc <= reach; dc++) {
    const away = dr * dr + dc * dc
    if (away > reach * reach) continue
    const share = h * h / (Math.PI * (away * step * step + h * h) ** 2)
    whole += share * step * step
    kernel.push({ by: dr * side + dc, share })
  }
  for (const k of kernel) k.share /= whole
  ground.forEach((area, at) => {
    if (area) for (const { by, share } of kernel) base[at + by] += area * share
  })
  return (e, n) => {
    const x = e / step + half, y = n / step + half, col = Math.floor(x), row = Math.floor(y), tx = x - col, ty = y - row
    if (col < 0 || row < 0 || col + 1 >= side || row + 1 >= side) return 0
    const at = row * side + col
    return (base[at] * (1 - tx) + base[at + 1] * tx) * (1 - ty) + (base[at + side] * (1 - tx) + base[at + side + 1] * tx) * ty
  }
}

export function townLightsOf(place: { lat: number; lon: number }, far: FarData | null | undefined, glow: number): TownLights {
  if (!far) {
    const air = evenAir(glow)
    return { under: () => Math.min(1, glow / GLOW_OF_BUILT), air: () => air }
  }
  let cells: BuiltCell[] | undefined, air: TownAir | undefined
  const near = () => cells ??= builtCells(place, far, REACH_KM)
  const bases: Partial<Record<CloudLevel, ReturnType<typeof baseLight>>> = {}
  return {
    under: (level, e, n) => Math.min(1, (bases[level] ??= baseLight(near(), LIT_FROM[level]))(e, n)),
    air: () => air ??= townAirOf(near()),
  }
}
