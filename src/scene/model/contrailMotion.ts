import { AHEAD_S } from '../../world/lifeAhead'
import { smoothstep } from '../../world/ridgeLighting'
import { trackAt } from './anim'
import { rotateScale } from './contrailFrame'
import type { LayerOf, Pt, Track } from './types'

export interface TrailProjection { point: Pt; widthPerM: number; visibility: number }

export interface ContrailMotion {
  puffs: { samples: TrailProjection[]; seed: number; ageS: number }[]
  head: Track | null
  lifeS: number
  spreadM: number
  endInS: number
}

export interface LaidPuff { point: Pt; width: number; alpha: number; ageS: number; seed: number | null }

// Linear between whole minutes. The worst midpoint position error was 0.0025 CSS px in the three fixture views.
// Adjacent windows share the same endpoints and segment after a handoff.
export const TRAIL_DRIFT_STEP_S = AHEAD_S / 2

export function trailTimeAt(layer: LayerOf<'contrail'>, phase: number, still: boolean): number {
  return still ? 0 : Math.min(AHEAD_S, Math.max(0, phase + layer.animated!.flight!.at))
}

const mix = (a: number, b: number, f: number) => a + (b - a) * f

/** Advance age on the scene timeline, independently for each emission. Widths are CSS px at each puff's altitude. */
export function trailAt(layer: LayerOf<'contrail'>, phase: number, still = false): LaidPuff[] {
  const { puffs, head, lifeS, spreadM, endInS } = layer.trail
  const t = trailTimeAt(layer, phase, still)
  const flight = trackAt(layer.animated!.flight, phase, still)!
  const base = layer.placed!
  const turn = (base.turn ?? 0) + flight.turn, scale = base.scale * flight.scale
  const x = base.x + flight.x, y = base.y + flight.y
  const sample = t / TRAIL_DRIFT_STEP_S
  const i = Math.min(1, Math.floor(sample)), f = sample - i
  const lay = (point: Pt, widthPerM: number, visibility: number, ageS: number, seed: LaidPuff['seed']): LaidPuff => {
    const age = ageS / lifeS
    const width = Math.max(0.6, Math.min(10, mix(40, spreadM, age) * widthPerM))
    const alpha = (0.62 - 0.3 * age) * (1 - smoothstep(0.55, 1, age)) * visibility
    return { point, width, alpha, ageS, seed }
  }
  const out: LaidPuff[] = []
  for (const puff of puffs) {
    const age = puff.ageS + t
    if (age < 0 || age > lifeS) continue
    const a = puff.samples[i], b = puff.samples[i + 1]
    const [px, py] = rotateScale([mix(a.point[0], b.point[0], f), mix(a.point[1], b.point[1], f)], turn, scale)
    out.push(lay([x + px, y + py], mix(a.widthPerM, b.widthPerM, f), mix(a.visibility, b.visibility, f), age, puff.seed))
  }
  // The continuous tip shares the airliner's sampled dome path and ends at its last emission.
  if (head && t < endInS) {
    const tip = trackAt(head, phase, still)!
    const last = out.at(-1)
    // A grid emission at the head already ends the ribbon. Keep its identity without introducing a zero-length edge.
    if (last?.ageS === 0) last.point = [tip.x, tip.y]
    else out.push(lay([tip.x, tip.y], tip.scale, tip.alpha, 0, null))
  }
  return out
}
