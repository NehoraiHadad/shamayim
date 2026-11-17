import { conditionLabel } from '../../domain/conditions'
import { clockOf, datePart, hourOf, minutesOfDay, weekdayHe } from '../../domain/time'
import type { LocalTime } from '../../domain/types'
import { formatProb, formatTemp } from '../../text/format'
import { fillGaps, scaleY, type Pt } from './curve'
import type { HourSlot, TimelineSlot } from './timeline'
import { addMinutes, minutesBetweenLocal } from '../../domain/minutes'

export const SLOT_W = 54
/**
 * The curve band: PAD above the highest point (room for its temperature label) and PAD below the lowest (room for the
 * sunrise/sunset label row), leaving 14 px of relief. Enough to show the day's shape; the numbers carry the values.
 */
export const BAND_H = 50
export const PAD = 18
/** Top of the curve band, with and without the rain-probability row. */
export const BAND_TOP = { withProb: 60, withoutProb: 46 }

export interface SunMarker {
  x: number
  rise: boolean
  time: LocalTime
}

export interface DayBreak {
  x: number
  label: string
}

export interface StripLayout {
  hours: HourSlot[]
  width: number
  pts: Pt[]
  suns: SunMarker[]
  breaks: DayBreak[]
  hasProb: boolean
}

/** RTL: the first hour sits at the right edge. */
const centerX = (width: number, i: number) => width - (i + 0.5) * SLOT_W

/** Inverse RTL strip coordinates: the first hour is at the rightmost slot centre. */
export function xAtTime(time: LocalTime, first: LocalTime, width: number): number {
  return width - SLOT_W / 2 - minutesBetweenLocal(first, time) / 60 * SLOT_W
}

export function timeAtX(x: number, first: LocalTime, width: number): LocalTime {
  return addMinutes(first, (width - SLOT_W / 2 - x) / SLOT_W * 60)
}

/** Hours on the x axis; sun events and midnights sit at their true time between hours. */
export function layoutStrip(slots: TimelineSlot[]): StripLayout {
  const hours = slots.filter((s): s is HourSlot => s.type === 'hour')
  const width = hours.length * SLOT_W
  const temps = fillGaps(hours.map((h) => h.temp))
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const pts = temps.map((t, i) => ({ x: centerX(width, i), y: scaleY(t, min, max, BAND_H, PAD) }))
  const suns: SunMarker[] = []
  for (const s of slots) {
    if (s.type !== 'sun') continue
    const i = hours.findLastIndex((h) => h.time <= s.time)
    if (i < 0) continue
    const into = (minutesOfDay(s.time) - minutesOfDay(hours[i].time)) / 60
    suns.push({ x: centerX(width, i) - into * SLOT_W, rise: s.rise, time: s.time })
  }
  const breaks = hours.flatMap((h, i) =>
    i > 0 && hourOf(h.time) === 0
      ? [{ x: centerX(width, i) + SLOT_W / 2, label: weekdayHe(datePart(h.time)).replace(/^יום\s+/, '') }]
      : [],
  )
  return { hours, width, pts, suns, breaks, hasProb: hours.some((h) => h.prob !== null) }
}

/** "15:00, מעונן, 26°, רוח 14 קמ״ש" (the time first; `at` names a minute inside the hour, for a moved time). */
export function describeHour(h: HourSlot, at?: LocalTime): string {
  const parts = [at ? clockOf(at) : h.isNow ? 'עכשיו' : clockOf(h.time), conditionLabel(h.kind, h.isDay), formatTemp(h.temp)]
  if (h.prob !== null) parts.push(`סיכוי לגשם ${formatProb(h.prob)}`)
  parts.push(`רוח ${Math.round(h.wind)} קמ״ש`)
  return parts.join(', ')
}
