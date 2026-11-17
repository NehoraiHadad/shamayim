import { THRESHOLDS as T } from '../config/thresholds'
import type { LocalTime, NowcastPoint } from '../domain/types'

export interface RainChange { kind: 'start' | 'stop'; minutes: number }
const MINUTE = 60_000
const SLOT = 15
/** UTC parsing is only arithmetic on local wall-clock values, independent of the device's timezone. */
export const localMillis = (time: LocalTime) => Date.parse(`${time}Z`)
export const afterMinutes = (time: LocalTime, minutes: number): LocalTime =>
  new Date(localMillis(time) + minutes * MINUTE).toISOString().slice(0, 16)

export function nowcastOf(points: NowcastPoint[] | null, now: LocalTime): RainChange | null {
  if (!points?.length) return null
  const at = localMillis(now)
  const first = points.findIndex((p) => localMillis(p.time) - SLOT * MINUTE < at && at <= localMillis(p.time))
  if (first < 0) return null
  const slots = points.slice(first).filter((p) => localMillis(p.time) <= at + T.nowcast.horizonMin * MINUTE)
  // A gap cannot stand for a dry interval or confirm a wet run.
  for (let i = 1; i < slots.length; i++) {
    if (localMillis(slots[i].time) - localMillis(slots[i - 1].time) !== SLOT * MINUTE) return null
  }
  const wet = (i: number) => slots[i].precipitation >= T.nowcast.wetMm
  const raining = wet(0)
  for (let i = 0; i < slots.length; i++) {
    let end = i, amount = 0
    while (end < slots.length && wet(end) === wet(i)) amount += slots[end++].precipitation
    const run = end - i
    if ((raining && !wet(i) && run >= T.nowcast.dryRun)
      || (!raining && wet(i) && (run >= T.nowcast.startRun || amount >= T.nowcast.startMm))) {
      return { kind: raining ? 'stop' : 'start', minutes: Math.max(0, (localMillis(slots[i].time) - at) / MINUTE - SLOT) }
    }
    i = end - 1
  }
  return null
}
