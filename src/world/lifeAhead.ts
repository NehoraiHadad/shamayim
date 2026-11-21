import { hashId } from '../data/landmarks/hash'
import type { FlightPoint, FlockSample, HighPlane, LowSample, TrailPuff } from './life'

export const AHEAD_S = 120
export const AHEAD_STEP_S = 2

function sample<T>(t: number, first: T, at: (t: number) => T): T[] {
  return [first, ...Array.from({ length: AHEAD_S / AHEAD_STEP_S }, (_, i) => at(t + (i + 1) * AHEAD_STEP_S))]
}

// Only sample 0 casts a terrain sight line. Occlusion and the land draw order are held for the shown minute.
const flockSample = ({ azimuth, altitude, distanceM, fade }: FlockSample): FlockSample => ({ azimuth, altitude, distanceM, fade })
export const flockAhead = (t: number, end: number, first: FlockSample, at: (t: number) => FlockSample) =>
  sample(t, flockSample(first), (tau) => flockSample(at(Math.min(tau, end))))

const lowSample = ({ at, ahead, fieldKm, overFieldM }: LowSample): LowSample => ({ at, ahead, fieldKm, overFieldM })
export const lowAhead = (t: number, end: number, first: LowSample, at: (t: number) => LowSample) =>
  sample(t, lowSample(first), (tau) => lowSample(at(Math.min(tau, end))))

export const highAhead = (t: number, end: number, first: FlightPoint | null, at: (t: number) => FlightPoint) =>
  sample(t, first, (tau) => tau <= end ? at(tau) : null)

/** Future puffs on the aged trail's 20 s emission grid. Paint them at age zero until the next world rebuild. */
export function trailAhead(plane: HighPlane, t: number, end: number, step: number, at: (t: number) => FlightPoint): TrailPuff[] {
  const until = Math.min(t + AHEAD_S, end)
  const puffs: TrailPuff[] = []
  const puff = (tau: number) => {
    const { e, n, up } = at(tau)
    // At raster time T this is P(τ) − wind · (τ − T), so at time t the drift places it at P(τ) + wind · (t − τ).
    puffs.push({ e: e - plane.driftE * (tau - t), n: n - plane.driftN * (tau - t), up, ageS: 0,
      seed: hashId(`${plane.id}:${Math.round(tau)}`) })
  }
  for (let tau = (Math.floor(t / step) + 1) * step; tau < until; tau += step) puff(tau)
  if (until > t) puff(until)
  return puffs
}
