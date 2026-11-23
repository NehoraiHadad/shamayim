import type { HourPoint, LocalTime } from '../../domain/types'
import { ALOFT_FACTOR } from '../wind'
import { unit } from './genus'

type Vector = [number, number]
type WindHour = Pick<HourPoint, 'time' | 'windSpeed' | 'windDirection' | 'windAloft'>
const heightsKm = [0.01, 1.46, 3.01, 9.16]
const levels = ['low', 'mid', 'high'] as const
// Integer nanokilometres make prefix subtraction independent of the forecast's start.
const ticksPerKm = 1e9

/** Local wall time treated as UTC, continuous except across a DST change. */
export function wallMinutes(at: LocalTime): number {
  const year = Number(at.slice(0, 4))
  const month = Number(at.slice(5, 7))
  const day = Number(at.slice(8, 10))
  const hour = Number(at.slice(11, 13))
  const minute = Number(at.slice(14, 16))
  const second = at.length > 16 ? Number(at.slice(17)) : 0
  return Date.UTC(year, month - 1, day, hour, minute) / 60_000 + second / 60
}

function vector(speedKmh: number, fromDeg: number): Vector {
  const toRad = (fromDeg + 180) * Math.PI / 180
  const kmPerMin = Math.max(0, Math.min(250, speedKmh)) / 60
  return [kmPerMin * Math.sin(toRad), kmPerMin * Math.cos(toRad)]
}

function profile(hour: WindHour): Vector[] {
  const fromDeg = Number.isFinite(hour.windDirection) ? hour.windDirection! : 270
  const winds = [vector(hour.windSpeed, fromDeg)]
  for (const level of levels) {
    const wind = hour.windAloft?.[level]
    winds.push(wind ? vector(wind.speed, wind.fromDeg)
      : vector(hour.windSpeed * ALOFT_FACTOR[level], fromDeg + (level === 'low' ? 20 : 30)))
  }
  return winds
}

function mix(a: Vector, b: Vector, f: number): Vector {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

function atHeight(values: Vector[], zAslKm: number, elevationKm: number): Vector {
  let bottom = elevationKm + 0.01
  let lower = values[0]
  for (let i = 1; i < heightsKm.length; i++) {
    const upper = heightsKm[i]
    // Pressure levels at or below the local surface cannot bracket an above-ground wind.
    if (upper <= bottom) continue
    if (zAslKm <= upper) return mix(lower, values[i], unit((zAslKm - bottom) / (upper - bottom)))
    bottom = upper
    lower = values[i]
  }
  return lower
}

/** Steering vector in east/north km per minute at a height in km asl. */
export function steeringWind(hour: WindHour, zAslKm: number, elevationKm = 0): Vector {
  return atHeight(profile(hour), zAslKm, elevationKm)
}

const windSamples = new WeakMap<WindHour, { minute: number; values: Vector[] }>()

interface Sample {
  minute: number
  winds: Vector[]
  cumulative: Vector[]
}

/** Preintegrate all requested steering heights in one pass. Heights are in km above sea level. */
export function steeringTimeline<T extends WindHour, K extends string>(hours: readonly T[], keys: readonly K[],
  heightsAt: (hour: T) => Record<K, number>, elevationKm: number) {
  const samples: Sample[] = []
  const zero: Vector = [0, 0]
  let derived = !hours.length
  for (const hour of hours) {
    let windSample = windSamples.get(hour)
    if (!windSample) {
      windSample = { minute: wallMinutes(hour.time), values: profile(hour) }
      windSamples.set(hour, windSample)
    }
    const { minute, values } = windSample
    const previous = samples[samples.length - 1]
    if (!Number.isFinite(minute) || (previous && minute <= previous.minute)) continue
    derived ||= !Number.isFinite(hour.windDirection) || !hour.windAloft?.low
      || !hour.windAloft?.mid || !hour.windAloft?.high
    const heights = heightsAt(hour)
    const winds: Vector[] = []
    const cumulative: Vector[] = []
    const halfElapsed = previous ? (minute - previous.minute) / 2 : 0
    for (let i = 0; i < keys.length; i++) {
      const wind = atHeight(values, heights[keys[i]], elevationKm)
      winds.push(wind)
      cumulative.push(previous ? [
        previous.cumulative[i][0] + Math.round((previous.winds[i][0] + wind[0]) * halfElapsed * ticksPerKm),
        previous.cumulative[i][1] + Math.round((previous.winds[i][1] + wind[1]) * halfElapsed * ticksPerKm),
      ] : zero)
    }
    const sample = { minute, winds, cumulative }
    samples.push(sample)
  }
  const cumulativeAt = (index: number, minute: number) => {
    if (!samples.length) return { base: zero, local: zero, vel: zero }
    let lo = 0
    let hi = samples.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >>> 1
      if (samples[mid].minute <= minute) lo = mid
      else hi = mid
    }
    const a = minute >= samples[hi].minute ? samples[hi] : samples[lo]
    const b = minute <= a.minute ? a : samples[hi]
    const elapsed = minute - a.minute
    const start = a.winds[index]
    const vel: Vector = a === b ? [start[0], start[1]] : mix(start, b.winds[index], elapsed / (b.minute - a.minute))
    const local: Vector = [elapsed * (start[0] + vel[0]) / 2, elapsed * (start[1] + vel[1]) / 2]
    return { base: a.cumulative[index], local, vel }
  }
  return {
    derived,
    at(index: number, minute: number, offset: Vector, midnight: number) {
      const current = cumulativeAt(index, minute)
      // Missing midnight falls back to the first forecast sample.
      const origin = midnight >= samples[0]?.minute && midnight <= samples[samples.length - 1]?.minute
        ? cumulativeAt(index, midnight) : { base: zero, local: zero }
      const d: Vector = [
        offset[0] + ((current.base[0] - origin.base[0]) / ticksPerKm + current.local[0] - origin.local[0]),
        offset[1] + ((current.base[1] - origin.base[1]) / ticksPerKm + current.local[1] - origin.local[1]),
      ]
      return { d, vel: current.vel }
    },
  }
}
