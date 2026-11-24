import type { LocalTime } from '../domain/types'
import type { Direction, SpecialEvent } from '../events/types'
import { clockRange, ltr } from './isolate'

const SIDES = ['צפון', 'צפון־מזרח', 'מזרח', 'דרום־מזרח', 'דרום', 'דרום־מערב', 'מערב', 'צפון־מערב']

function whereText({ azimuth, altitude }: Direction): string {
  if (altitude >= 70) return 'כמעט מעל הראש'
  const side = SIDES[Math.round(azimuth / 45) % 8]
  return `${altitude >= 40 ? 'גבוה ב' : altitude < 12 ? 'נמוך ב' : 'ב'}${side}`
}

/** "היום", "הערב", "הלילה", "הבוקר", "מחר": the part of the day as it is said now. */
function partText(at: LocalTime, now: LocalTime): string {
  const hour = Number(at.slice(11, 13)), today = at.slice(0, 10) === now.slice(0, 10)
  if (hour >= 21 || hour < 5) return 'הלילה'
  if (!today) return 'מחר'
  return hour < 11 ? 'הבוקר' : hour < 17 ? 'היום' : 'הערב'
}

function whenText({ from, to, tell }: SpecialEvent['when'], now: LocalTime): string {
  const clock = (at: LocalTime) => at.slice(11, 16), part = partText(from, now)
  if (from <= now) return tell === 'span' && to > now ? `עכשיו, עד ${ltr(clock(to))}` : 'עכשיו'
  if (tell === 'span' && to > from) return `${part} ${clockRange(clock(from), clock(to))}`
  return `${part} ${tell === 'from' ? 'מ־' : 'ב־'}${ltr(clock(from))}`
}

/** The event in one quiet line: what, when, where to look ("ירח מלא זורח · היום ב־16:52 · נמוך במזרח"). */
export const specialEventText = (event: SpecialEvent, now: LocalTime): string =>
  `${event.what} · ${whenText(event.when, now)} · ${whereText(event.where)}`
