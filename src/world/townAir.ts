import type { FarData } from '../data/city/farData'
import { eachBuiltCell, walker } from './builtCells'

/*
 * The air the towns light at night, by bearing: each built cell's share of the place's sky glow (Walker's law, the sum
 * `env.glow` is) over the angle its dome of lit air fills. From inside a city it stands on every side and overhead; from
 * the open country it is a low wide dome over each town's true bearing.
 */

/** A dome of lit air over a bearing: its glow above the even one, how wide and how high it stands (deg, half-fall). */
export interface TownDome { azimuth: number; glow: number; width: number; height: number }
export interface TownAir {
  /** The glow on every side alike, and the height it falls to half by. */
  even: { glow: number; height: number }
  /** The brightest domes over it, at most `DOMES`. */
  domes: TownDome[]
  /** The whole glow toward a bearing, and its height. */
  toward: (azimuth: number) => { glow: number; height: number }
}

/** Towns beyond this add nothing to the air over the place (Walker's law). */
export const AIR_REACH_KM = 60
/** The lit air over a town: a dome ~3 km deep (two scale heights of the aerosol) and as wide, seen from its distance. */
const DOME_KM = 3
/** A dome in front of, or over, the eye fills the sky up to here (deg). */
const HIGHEST = 60
const DOMES = 3
export const SECTOR = 5, SECTORS = 360 / SECTOR
const RAD = Math.PI / 180

/** Sector values (from index `from`) at a bearing, linear between the sectors. */
export function sectorAt(values: ArrayLike<number>, azimuth: number, from = 0): number {
  const at = (((azimuth / SECTOR) % SECTORS) + SECTORS) % SECTORS
  const i = Math.floor(at), t = at - i
  return values[from + i % SECTORS] * (1 - t) + values[from + (i + 1) % SECTORS] * t
}

const apart = (a: number, b: number) => Math.min(Math.abs(a - b), SECTORS - Math.abs(a - b))

/** Each cell's share spread over the sectors its dome fills (a Gaussian), and the mean height of what stands there. */
function ringOf(place: { lat: number; lon: number }, far: FarData) {
  const glow = new Float64Array(SECTORS), height = new Float64Array(SECTORS)
  // Cells gathered by bearing and by the width their dome is seen at (sectors): each spread is laid once.
  const seen = new Map<number, { from: number; width: number; share: number }>()
  eachBuiltCell(place, far, AIR_REACH_KM, (e, n, km, area) => {
    const width = Math.max(1, Math.min(SECTORS / 4, Math.round(Math.atan2(DOME_KM, km) / RAD / SECTOR)))
    const from = (Math.round(Math.atan2(e, n) / RAD / SECTOR) + SECTORS) % SECTORS
    const key = from * SECTORS + width, share = walker(km, area), s = seen.get(key)
    if (s) s.share += share
    else seen.set(key, { from, width, share })
  })
  const sectors = Array.from({ length: SECTORS }, (_, k) => k)
  for (const { from, width, share } of seen.values()) {
    const weight = sectors.map((k) => Math.exp(-0.5 * (apart(k, from) / width) ** 2))
    const total = weight.reduce((a, b) => a + b, 0)
    for (const k of sectors) {
      // The mean round the horizon stays the place's `env.glow`.
      const part = share * weight[k] * SECTORS / total
      glow[k] += part
      height[k] += part * Math.min(HIGHEST, width * SECTOR)
    }
  }
  for (const k of sectors) height[k] = glow[k] > 0 ? height[k] / glow[k] : SECTOR
  return { glow, height }
}

/** The ring's brightest stretches over its least: peak by peak, each taken off before the next is looked for. */
function domesOf(glow: ArrayLike<number>, height: ArrayLike<number>, even: number): TownDome[] {
  const left = Array.from(glow, (g) => g - even)
  const out: TownDome[] = []
  while (out.length < DOMES) {
    const peak = left.indexOf(Math.max(...left)), top = left[peak]
    if (!(top > 0.02)) break
    // Its half-width: where it has fallen to half on its nearer side (at most a quarter of the horizon).
    let k = 1
    while (k < SECTORS / 4 && left[(peak + k) % SECTORS] > top / 2 && left[(peak - k + SECTORS) % SECTORS] > top / 2) k++
    out.push({ azimuth: peak * SECTOR, glow: top, width: k * SECTOR, height: height[peak] })
    left.forEach((_, i) => { left[i] -= top * Math.max(0, 1 - apart(i, peak) / (2 * k)) })
  }
  return out
}

export function townAirOf(place: { lat: number; lon: number }, far: FarData): TownAir {
  const { glow, height } = ringOf(place, far)
  const even = Math.min(...glow)
  return {
    even: { glow: even, height: height[glow.indexOf(even)] },
    domes: domesOf(glow, height, even),
    toward: (azimuth) => ({ glow: sectorAt(glow, azimuth), height: sectorAt(height, azimuth) }),
  }
}

/** Without the raster: the place's own `glow` (its built share or population) on every side. */
export const evenAir = (glow: number): TownAir =>
  ({ even: { glow, height: HIGHEST / 2 }, domes: [], toward: () => ({ glow, height: HIGHEST / 2 }) })
