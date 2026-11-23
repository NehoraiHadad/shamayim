import { hashId, seeded } from '../../data/landmarks/hash'
import { smoothstep } from '../../world/ridgeLighting'
import type { WorldState, RainCell } from '../../world/types'
import { RAIN_GREY } from './cloudLight'
import type { SkyGeom } from './sky'
import { mixRgb } from './tone'
import type { FallingCloud, FallMark, Precip, Pt, RGB, SceneBox, ShaftDesc } from './types'
import { clamp01, WHITE } from './weatherShared'

/** A bank this high on the dome (deg) or higher rains round the eye (near rain); lower ones are far curtains. */
export const NEAR_ALT = 30

/** What falls, from which banks, with its intensity and opacity as the rate eases in. */
export interface PrecipState { precip: Precip; cells: RainCell[]; strength: number; slant: number; opacity: number }

export function precipOf(world: WorldState, precip: Precip = world.rain?.cells.length ? 'rain' : 'snow'): PrecipState | null {
  if (precip === 'rain' && world.rain?.cells.length) {
    const { cells, slant, rateMmH } = world.rain
    return { precip, cells, slant, strength: clamp01(0.15 + Math.sqrt(rateMmH) / 2.6), opacity: smoothstep(0, 0.2, rateMmH) }
  }
  if (precip === 'snow' && world.snowfall?.cells.length) {
    const { cells, slant, amount } = world.snowfall
    return { precip, cells, slant, strength: clamp01(0.2 + amount), opacity: smoothstep(0, 0.2, amount) }
  }
  return null
}

/** The copy of a band x (every `period`) nearest `ref`. */
export const nearest = (x: number, ref: number, period: number) => x + Math.round((ref - x) / period) * period

/** Whether a bank stands in the view (its nearest copy round the band overlaps the figure). */
export function inView(geom: SkyGeom, box: SceneBox, b: { x: number; w: number }) {
  const mid = geom.left + box.width / 2
  return Math.abs(nearest(b.x, mid, geom.period) - mid) < box.width / 2 + b.w * 0.3
}

/** The curtain under a far bank: from inside its base to the ground at the horizon, the foot carried downwind. */
export function shaftOf(world: WorldState, geom: SkyGeom, b: FallingCloud, p: PrecipState, horizonSky: RGB): ShaftDesc {
  const top = b.y - b.h * 0.2
  const bottom = geom.horizon + 2
  const lean = Math.tan(p.slant) * (bottom - top) * (p.precip === 'snow' ? 0.6 : 1)
  const far = world.air.fade(b.distanceKm)
  // A rain curtain is the dark of the base it falls from (heavy shower rain is opaque to the light behind it), faded
  // only by the air between, as far land is.
  // By night it is a darker patch of the night sky.
  const rgb = p.precip === 'rain' ? mixRgb(mixRgb(RAIN_GREY, horizonSky, 0.15 + 0.7 * far),
    mixRgb(horizonSky, [0, 0, 0], 0.3), world.night.dark)
    : mixRgb(mixRgb(b.body, WHITE, 0.25 * (1 - world.night.dark)), horizonSky, 0.3 + 0.5 * far)
  // A shower a few kilometres off is a grey wall, not a veil: nearness thickens it, the air between thins it.
  const alpha = Math.min(0.85, (p.precip === 'rain' ? 0.4 + 0.4 * p.strength : 0.22 + 0.3 * p.strength) * (1.4 - 0.9 * far)
    * b.alpha * p.opacity)
  return { id: b.id, x: b.x, top, bottom, w: b.w * 0.62, lean, rgb, alpha, seed: b.seed }
}

/** The falling tile: rain streaks along the slant, or snow flakes, seeded, wrapping across the tile's edges. */
export function tileMarks(seed: string, p: PrecipState, w: number, h: number, near: boolean): FallMark[] {
  const r = seeded(hashId(seed))
  const area = w * h
  const count = Math.round((p.precip === 'rain' ? (near ? 14 : 22) : (near ? 9 : 20)) * area / 4096 * (0.45 + 0.55 * p.strength))
  return Array.from({ length: count }, () => {
    const x = r() * w, y = r() * h, v = r()
    return p.precip === 'rain'
      ? { x, y, len: (near ? 9 : 4.5) + (near ? 9 : 4) * v, r: 0, alpha: 0.45 + 0.55 * r() }
      // Flakes: most small and dim (farther off), a few large and bright (close by).
      : { x, y, len: 0, r: (near ? 0.5 : 0.4) + (near ? 1.5 : 0.4) * v ** 3, alpha: 0.3 + 0.7 * v ** 1.5 * (0.6 + 0.4 * r()) }
  })
}

/** A column (or curtain) as a polygon: `w` wide at `top`, the same width at `bottom`, its foot `lean` px downwind. */
export const column = (x: number, top: number, bottom: number, w: number, lean: number): Pt[] =>
  [[x - w / 2, top], [x + w / 2, top], [x + w / 2 + lean, bottom], [x - w / 2 + lean, bottom]]
