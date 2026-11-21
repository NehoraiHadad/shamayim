import { hashId } from '../data/landmarks/hash'
import type { FlightPoint, FlockSample, HighPlane, LowSample, TrailPuff } from './life'

export const AHEAD_S = 120
export const AHEAD_STEP_S = 2

function sample<T>(t: number, first: T, at: (t: number) => T): T[] {
  return [first, ...Array.from({ length: AHEAD_S / AHEAD_STEP_S }, (_, i) => at(t + (i + 1) * AHEAD_STEP_S))]
}

// Only sample 0 casts a terrain sight line. The 60 s hold can change a foreground copy's membership or depth at the
// rebuild: 229 of 3969 matching fixture base-layer pairs had a change whose sprite bounds overlapped drawn land.
const flockSample = ({ azimuth, altitude, distanceM, fade }: FlockSample): FlockSample => ({ azimuth, altitude, distanceM, fade })
export const flockAhead = (t: number, end: number, first: FlockSample, at: (t: number) => FlockSample) =>
  sample(t, flockSample(first), (tau) => flockSample(at(Math.min(tau, end))))

const lowSample = ({ at, ahead, fieldKm, overFieldM }: LowSample): LowSample => ({ at, ahead, fieldKm, overFieldM })
export const lowAhead = (t: number, end: number, first: LowSample, at: (t: number) => LowSample) =>
  sample(t, lowSample(first), (tau) => lowSample(at(Math.min(tau, end))))

export const highAhead = (t: number, end: number, first: FlightPoint | null, at: (t: number) => FlightPoint) =>
  sample(t, first, (tau) => tau <= end ? at(tau) : null)

export const trailPuffSeed = (id: string, emissionS: number) => hashId(`${id}:${emissionS}`)

/** Future puffs on the same emission grid as the aged trail, plus the crossing's actual endpoint. */
export function trailAhead(plane: HighPlane, t: number, end: number, step: number, at: (t: number) => FlightPoint): TrailPuff[] {
  const until = Math.min(t + AHEAD_S, end)
  const puffs: TrailPuff[] = []
  const puff = (tau: number) => {
    const { e, n, up } = at(tau)
    // At raster time T this is P(τ) − wind · (τ − T), so at time t the drift places it at P(τ) + wind · (t − τ).
    puffs.push({ e: e - plane.driftE * (tau - t), n: n - plane.driftN * (tau - t), up, ageS: 0, inS: tau - t,
      seed: trailPuffSeed(plane.id, tau) })
  }
  for (let tau = (Math.floor(t / step) + 1) * step; tau <= until; tau += step) puff(tau)
  if (end > t && end <= until && end % step !== 0) puff(end)
  return puffs
}
