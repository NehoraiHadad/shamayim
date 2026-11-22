import type { Wind } from '../../world/types'
import { ease, gustAt } from './anim'

// NOAA's land Beaufort scale: calm below 0.3 m/s, small trees sway at B5,
// whole trees move at B7 (13.9–17.1 m/s). The square approximates drag at
// modest speeds. Mean bend saturates at 1.0 at the upper end of B7; above
// FULL_BEND_MS, gust excess still uses the unsaturated drag difference
// (clamped to 1 × GUST_SHARE = 0.55) so gusts remain visible in a gale, giving
// a peak bend bound of 1.55× full bend (matched by canopy.ts's 1.55 pad).
// https://www.weather.gov/tbw/beaufort
const CALM_MS = 0.3
const FULL_BEND_MS = 17.1
const GUST_SHARE = 0.55
const load = (ms: number) => (ms / FULL_BEND_MS) ** 2

/** The C7 two-second sway interval, with ten poses to resolve short travel at the frond tips. */
export const LAND_GUST = { count: 10, fps: 5 } as const
const GUST_SECONDS = LAND_GUST.count / LAND_GUST.fps

export interface PlantWind {
  /** Signed mean and gust load, positive towards screen right, exactly like Wind.across. */
  lean: number
  gust: number
}

/** Quantise the response to 1/64 of full bend, below a tenth px on typical crowns. */
const step = (v: number) => Math.sign(v) * Math.round(Math.abs(v) * 64) / 64 || 0
export function plantWindOf({ across, ms, gustMs }: Pick<Wind, 'across' | 'ms' | 'gustMs'>): PlantWind {
  if (ms < CALM_MS) return { lean: 0, gust: 0 }
  return {
    lean: step(across * Math.min(1, load(ms))),
    // Forecast gust excess supplies the incremental drag. Keep a little travel
    // above the mean's cap, including in a gale (peak lean + gust ≤ 1.55).
    // Identical mean/gust gives no sway.
    gust: step(across * GUST_SHARE * Math.min(1, load(Math.max(ms, gustMs)) - load(ms))),
  }
}

/** Stage 4 visibility already fades with m/px. Quiet the last fifth as silhouettes merge into the surface. */
export const plantWindFade = (visibility: number) => ease((visibility - 0.20) / 0.80)

/** Signed bend factor at this phase. Frame 0 (also reduced motion) is the mean-wind pose. */
export function plantWindAt(wind: PlantWind, seconds: number, seedPhase: number): number {
  if (!wind.gust || !seconds) return wind.lean
  const t = seconds / GUST_SECONDS
  // A common gust envelope, with local branch lag of up to ±0.16 s.
  const delay = (seedPhase / (2 * Math.PI) - 0.5) * 0.16
  const pulse = gustAt(t + delay) * (0.5 - 0.5 * Math.cos(2 * Math.PI * t))
  // A lull never bends a crown into the wind.
  const bend = wind.lean + wind.gust * pulse
  return wind.lean < 0 || wind.gust < 0 ? Math.min(0, bend) : Math.max(0, bend)
}

/** Artist-tuned tip travel as a share of drawn height (trees) or radius (fronds/tufts).
 * Palm trunks (3) and mature woodland/olive trunks (0, 1: thick woody stems) give a little;
 * lighter citrus/generic orchard canopies (2, 4) give more; grass blades and palm fronds stream.
 */
export const treeTravel = (kind: number, height: number) =>
  height * (kind === 3 ? 0.055 : kind === 0 || kind === 1 ? 0.095 : 0.18)
export const frondTravel = (r: number) => r * 0.70
export const tuftTravel = (kind: number, r: number) => r * (kind === 1 ? 1.10 : 0.32)
