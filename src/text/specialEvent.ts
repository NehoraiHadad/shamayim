import type { LocalTime } from '../domain/types'
import type { Direction, SpecialEvent } from '../events/types'
import { ltr } from './isolate'

const SIDES = ['צפון', 'צפון־מזרח', 'מזרח', 'דרום־מזרח', 'דרום', 'דרום־מערב', 'מערב', 'צפון־מערב']
const sideOf = (azimuth: number) => SIDES[Math.round(azimuth / 45) % 8]

function whereText({ azimuth, altitude }: Direction): string {
  if (altitude >= 70) return 'כמעט מעל הראש'
  const side = sideOf(azimuth)
  return `${altitude >= 40 ? 'גבוה ב' : altitude < 12 ? 'נמוך ב' : 'ב'}${side}`
}

/** "היום", "הערב", "הלילה", "הבוקר", "מחר": the part of the day as it is said now. */
function partText(at: LocalTime, now: LocalTime): string {
  const hour = Number(at.slice(11, 13)), today = at.slice(0, 10) === now.slice(0, 10)
  if (hour >= 21 || hour < 5) return 'הלילה'
  if (!today) return 'מחר'
  return hour < 11 ? 'הבוקר' : hour < 17 ? 'היום' : 'הערב'
}

function whenText({ when: { from, to, tell }, approximateTime }: SpecialEvent, now: LocalTime): string {
  const clock = (at: LocalTime) => at.slice(11, 16), part = partText(from, now)
  if (from <= now) return tell === 'span' && to > now ? `עכשיו, עד ${ltr(clock(to))}` : 'עכשיו'
  if (tell === 'span' && to > from) return `${part} ${ltr(clock(from))}\u2060–\u2060${ltr(clock(to))}`
  if (approximateTime) return `${part} סביב ${ltr(clock(from))}`
  return `${part} ${tell === 'from' ? 'מ־' : 'ב־'}${ltr(clock(from))}`
}

/** The event in one line: what, when and where to look, phrased for the viewing forecast. */
export function specialEventText(event: SpecialEvent, now: LocalTime): string {
  const time = whenText(event, now)
  const viewing = event.viewing === 'cloud-dependent' ? `ייתכן שייראה ${time}`
    : event.viewing === 'expected' && event.when.from > now ? `צפוי להיראות ${time}` : time
  const parts = [event.what, viewing]
  if (event.peak && event.peak >= now) parts.push(`שיא ב־${ltr(event.peak.slice(11, 16))}`)
  const from = sideOf(event.where.azimuth), to = event.track && sideOf(event.track.to.azimuth)
  parts.push(to && to !== from ? `מ${from} ל${to}` : whereText(event.where))
  if (event.kind === 'solar-eclipse') parts.push('צפייה ישירה רק עם משקפי ליקוי תקניים (ISO 12312‑2)')
  if (event.kind === 'solar-halo') parts.push('הסתירו את השמש מאחורי מבנה והימנעו ממבט ישיר אליה')
  if (event.kind === 'comet') parts.push('תצפיות COBS ומסלול JPL')
  return parts.join(' · ')
}
