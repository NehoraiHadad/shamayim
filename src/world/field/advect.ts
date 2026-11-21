import type { HourPoint, LocalTime } from '../../domain/types'
import { ALOFT_FACTOR } from '../wind'
import { unit } from './genus'

type Vector = [number, number]
type WindHour = Pick<HourPoint, 'time' | 'windSpeed' | 'windDirection' | 'windAloft'>
const heightsKm = [0.01, 1.46, 3.01, 9.16]
const levels = ['low', 'mid', 'high'] as const

/** Local wall time treated as UTC, continuous except across a DST change. */
export function wallMinutes(at: LocalTime): number {
  const [year, month, day, hour, minute, second = 0] = at.split(/[-T:]/).map(Number)
  return Date.UTC(year, month - 1, day, hour, minute) / 60_000 + second / 60
}

function vector(speedKmh: number, fromDeg: number): Vector {
  const toRad = (fromDeg + 180) * Math.PI / 180
  const kmPerMin = Math.max(0, Math.min(250, speedKmh)) / 60
  return [kmPerMin * Math.sin(toRad), kmPerMin * Math.cos(toRad)]
}

function profile(hour: WindHour, fallbackFromDeg: number): Vector[] {
  const fromDeg = hour.windDirection ?? fallbackFromDeg
  return [
    vector(hour.windSpeed, fromDeg),
    ...levels.map((level, i) => {
      const wind = hour.windAloft?.[level]
      return wind ? vector(wind.speed, wind.fromDeg)
        : vector(hour.windSpeed * ALOFT_FACTOR[level], fromDeg + (i === 0 ? 20 : 30))
    }),
  ]
}

function mix(a: Vector, b: Vector, f: number): Vector {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
}

function atHeight(values: Vector[], zAslKm: number): Vector {
  const i = zAslKm <= heightsKm[1] ? 0 : zAslKm <= heightsKm[2] ? 1 : 2
  return mix(values[i], values[i + 1], unit((zAslKm - heightsKm[i]) / (heightsKm[i + 1] - heightsKm[i])))
}

/** Steering vector in east/north km per minute at a height in km asl. */
export function steeringWind(hour: WindHour, zAslKm: number): Vector {
  return atHeight(profile(hour, 270), zAslKm)
}

interface Sample {
  minute: number
  winds: Vector[]
  cumulative: Vector[]
}
interface Timeline {
  date: string
  anchor: Vector[]
  first: Sample
  last: Sample
  segments: Map<number, [Sample, Sample]>
}
const timelines = new WeakMap<readonly WindHour[], Timeline>()
const zeroProfile = heightsKm.map((): Vector => [0, 0])

function integrate(a: Sample, b: Sample, minute: number): [Vector[], Vector[]] {
  const elapsed = minute - a.minute
  const duration = b.minute - a.minute
  const f = duration > 0 ? unit(elapsed / duration) : 0
  const winds = a.winds.map((v, i) => mix(v, b.winds[i], f))
  const cumulative = a.cumulative.map((v, i): Vector => [
    v[0] + elapsed * (a.winds[i][0] + winds[i][0]) / 2,
    v[1] + elapsed * (a.winds[i][1] + winds[i][1]) / 2,
  ])
  return [cumulative, winds]
}

function makeTimeline(hours: readonly WindHour[]): Timeline {
  const segments = new Map<number, [Sample, Sample]>()
  let first: Sample | undefined
  let previous: Sample | undefined
  let midnight: Sample | undefined
  for (const hour of hours) {
    const minute = wallMinutes(hour.time)
    if (!Number.isFinite(minute) || (previous && minute <= previous.minute)) continue
    const sample: Sample = { minute, winds: profile(hour, 270), cumulative: zeroProfile }
    first ??= sample
    if (previous) {
      sample.cumulative = integrate(previous, sample, minute)[0]
      for (let h = Math.floor(previous.minute / 60); h < Math.ceil(minute / 60); h++) {
        segments.set(h, [previous, sample])
      }
    }
    if (minute % 1440 === 0) midnight ??= sample
    previous = sample
  }
  const start = first ?? { minute: 0, winds: zeroProfile, cumulative: zeroProfile }
  return {
    date: new Date((midnight ?? start).minute * 60_000).toISOString().slice(0, 10),
    anchor: midnight?.cumulative ?? zeroProfile, first: start, last: previous ?? start, segments,
  }
}

function timelineOf(hours: readonly WindHour[]): Timeline {
  let timeline = timelines.get(hours)
  if (!timeline) {
    timeline = makeTimeline(hours)
    timelines.set(hours, timeline)
  }
  return timeline
}

/** Date used to seed the air frame for this forecast window. */
export function anchorDate(hours: readonly WindHour[], at: LocalTime): string {
  return hours.length ? timelineOf(hours).date : at.slice(0, 10)
}

/** Integrate the steering vector from the forecast anchor, in km. */
export function displacement(hours: readonly WindHour[], at: LocalTime, zAslKm: number, anchorOffset: Vector) {
  const timeline = timelineOf(hours)
  const minute = wallMinutes(at)
  const edge = minute < timeline.first.minute ? timeline.first : timeline.last
  const [a, b] = timeline.segments.get(Math.floor(minute / 60)) ?? [edge, edge]
  const [cumulative, winds] = integrate(a, b, minute)
  const distance = atHeight(cumulative, zAslKm)
  const anchor = atHeight(timeline.anchor, zAslKm)
  const vel = atHeight(winds, zAslKm)
  const d: Vector = [anchorOffset[0] + distance[0] - anchor[0], anchorOffset[1] + distance[1] - anchor[1]]
  return { d, vel }
}
