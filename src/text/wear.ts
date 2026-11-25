import { THRESHOLDS as T } from '../config/thresholds'
import { addMinutes } from '../domain/minutes'
import { datePart, hourOf } from '../domain/time'
import type { Forecast, LocalDate, LocalTime } from '../domain/types'
import { hoursBetween, windowFacts } from './facts'
import { DURING, joinClauses } from './phrases'
import { rainGear } from './wearRain'

/** Clothing levels, warmest first. Lower bounds in °C of the felt temperature. */
const LEVELS = [
  { from: 24, text: 'חולצה קצרה', garment: 'tee' },
  { from: 19, text: 'שרוול ארוך דק', garment: 'longSleeve' },
  { from: 14, text: 'סוודר קל', garment: 'sweater' },
  { from: 9, text: 'סוודר או ז׳קט', garment: 'jacket' },
  { from: -Infinity, text: 'מעיל', garment: 'coat' },
] as const

/** Things the sentence names, in its order, for the drawing beside it. */
export type Garment = (typeof LEVELS)[number]['garment'] | 'umbrella' | 'rainJacket' | 'sunHat' | 'water'

/** Wind makes it feel colder: knock off a couple of degrees when it is brisk. */
const WIND_PENALTY = 2
const TOMORROW_FROM = 21
const AFTERNOON_FROM = 15
// The midday layer leads while midday is still ahead.
const PERIODS = [
  ['noon', 11, AFTERNOON_FROM],
  ['morning', 7, 11],
  ['afternoon', AFTERNOON_FROM, 18],
  ['evening', 18, 22],
  ['night', 22, 24],
] as const

export interface WearTip {
  /** "היום" / "מחר" — which day the advice is for. */
  when: string
  text: string
  /** The picture alone cannot convey a change of layer or important advice about gear. */
  hasTimingOrGear: boolean
  /** What the sentence names, with the daytime layers first and extras last. */
  garments: Garment[]
}

function atHour(date: LocalDate, hour: number): LocalTime {
  return `${date}T${String(hour).padStart(2, '0')}:00`
}

function levelFor(f: Forecast, date: LocalDate, fromHour: number, toHour: number): number | null {
  if (fromHour >= toHour) return null
  const hours = hoursBetween(f, atHour(date, fromHour), atHour(date, toHour))
  if (!hours.length) return null
  const temp = hours.reduce((s, h) => s + h.temperature, 0) / hours.length
  const wind = Math.max(...hours.map((h) => h.windSpeed))
  const felt = temp - (wind >= T.wind.brisk ? WIND_PENALTY : 0)
  return LEVELS.findIndex((l) => felt >= l.from)
}

/** What to wear for the remaining parts of today, switching to tomorrow at 21:00 local time. */
export function wearTip(f: Forecast, now: LocalTime): WearTip | null {
  const today = datePart(now)
  const useToday = hourOf(now) < TOMORROW_FROM
  const date = useToday ? today : datePart(addMinutes(now, 24 * 60))
  const startHour = useToday ? Math.max(7, hourOf(now)) : 7

  const layers = new Map<number, string[]>()
  let midday: number | null = null
  for (const [part, from, to] of PERIODS) {
    const level = levelFor(f, date, Math.max(from, startHour), to)
    if (level === null) continue
    if (part === 'noon') midday = level
    layers.set(level, [...(layers.get(level) ?? []), DURING[part]])
  }
  const clothes = [...layers].map(([level, when]) => ({ ...LEVELS[level], when }))
  const [first] = clothes
  if (!first) return null

  const layersChange = clothes.length > 1
  const garments: Garment[] = clothes.map(({ garment }) => garment)
  const remaining = useToday && startHour >= 11 ? 'להמשך היום' : 'לכל היום'
  const parts = [layersChange
    ? `${clothes.map(({ text, when }) => `${text} ${when.length <= 2 ? when.join(' ו') : joinClauses(when)}`).join(', ')}.`
    : `${first.text} ${remaining}.`]

  // Only the hours still ahead: rain that has already passed calls for nothing.
  const from = atHour(date, startHour)
  const facts = windowFacts(f, from, atHour(date, 24))
  const gear = rainGear(facts, garments.includes('coat'), useToday && startHour >= AFTERNOON_FROM ? now : undefined)
  if (gear) {
    parts.push(gear.text)
    if (gear.garment) garments.push(gear.garment)
  }
  const noonEnd = atHour(date, AFTERNOON_FROM)
  const uv = (f.air ?? []).filter((a) => a.time >= from && a.time < noonEnd).map((a) => a.uv ?? 0)
  const maxTemp = Math.max(...facts.hours.map((h) => h.temperature))
  if (maxTemp >= T.dayTemp.hot) {
    parts.push('בגדים בהירים, כובע והרבה מים.')
    garments.push('sunHat', 'water')
  } else if (uv.length && Math.max(...uv) >= 8 && midday === 0) {
    parts.push('כובע וקרם הגנה בצהריים.')
    garments.push('sunHat')
  }

  return { when: date === today ? 'היום' : 'מחר', text: parts.join(' '), hasTimingOrGear: layersChange || parts.length > 1, garments }
}

/** Advice still relevant today once the clothesline is showing tomorrow. */
export function restOfDayWearTip(f: Forecast, now: LocalTime): string | null {
  const hour = hourOf(now)
  if (hour < TOMORROW_FROM) return null
  const today = datePart(now)
  const facts = windowFacts(f, now, atHour(today, 24))
  if (!facts.hours.length) return null

  const current = levelFor(f, today, hour, hour + 1)
  const later = levelFor(f, today, hour + 1, 24)
  const layer = current !== null && later !== null && later > current ? LEVELS[later] : null
  const gear = rainGear(facts, layer?.garment === 'coat', now)
  const layerAdvice = layer && gear?.garment !== 'coat' ? `כדאי לקחת ${layer.text}.` : ''
  return [layerAdvice, gear?.text].filter(Boolean).join(' ') || null
}
