import { THRESHOLDS as T } from '../config/thresholds'
import { hourOf } from '../domain/time'
import type { Forecast, LocalDate, LocalTime } from '../domain/types'
import { hoursBetween, nextDate, windowFacts } from './facts'
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

export interface WearTip {
  /** "היום" / "מחר" — which day the advice is for. */
  when: string
  text: string
  /** What the sentence names: the midday layer, the cooler-hours layer (if any), then extras. */
  garments: Garment[]
}

function levelFor(f: Forecast, date: LocalDate, fromHour: number, toHour: number): number | null {
  const from = `${date}T${String(fromHour).padStart(2, '0')}:00`
  const to = `${date}T${String(toHour).padStart(2, '0')}:00`
  const hours = hoursBetween(f, from, to)
  if (!hours.length) return null
  const temp = hours.reduce((s, h) => s + h.temperature, 0) / hours.length
  const wind = Math.max(...hours.map((h) => h.windSpeed))
  const felt = temp - (wind >= T.wind.brisk ? WIND_PENALTY : 0)
  return LEVELS.findIndex((l) => felt >= l.from)
}

/** What to wear for the rest of today (before 15:00) or tomorrow. */
export function wearTip(f: Forecast, now: LocalTime): WearTip | null {
  const today = now.slice(0, 10)
  const useToday = hourOf(now) < 15
  const date = useToday ? today : nextDate(f, today)
  if (!date) return null
  const startHour = useToday ? Math.max(7, hourOf(now)) : 7
  const morning = startHour < 11 ? levelFor(f, date, startHour, 11) : null
  const midday = levelFor(f, date, Math.max(12, startHour), 16)
  const evening = levelFor(f, date, 18, 22)
  if (midday === null) return null

  const parts: string[] = []
  const garments: Garment[] = [LEVELS[midday].garment]
  const cooler = [
    morning !== null && morning > midday ? 'בבוקר' : '',
    evening !== null && evening > midday ? 'בערב' : '',
  ].filter(Boolean)
  const coolest = Math.max(midday, morning ?? midday, evening ?? midday)
  if (!cooler.length) {
    parts.push(`${LEVELS[midday].text} לכל היום.`)
  } else {
    parts.push(`${LEVELS[midday].text} בצהריים, ${LEVELS[coolest].text} ${cooler.join(' ו')}.`)
    if (coolest !== midday) garments.push(LEVELS[coolest].garment)
  }

  // Only the hours still ahead: rain that has already passed calls for nothing.
  const facts = windowFacts(f, `${date}T${String(startHour).padStart(2, '0')}:00`, `${date}T22:00`)
  const gear = rainGear(facts, garments.includes('coat'))
  if (gear) {
    parts.push(gear.text)
    if (gear.garment) garments.push(gear.garment)
  }
  const uv = (f.air ?? []).filter((a) => a.time.startsWith(date)).map((a) => a.uv ?? 0)
  const maxTemp = Math.max(...facts.hours.map((h) => h.temperature))
  if (maxTemp >= T.dayTemp.hot) {
    parts.push('בגדים בהירים, כובע והרבה מים.')
    garments.push('sunHat', 'water')
  } else if (uv.length && Math.max(...uv) >= 8 && midday === 0) {
    parts.push('כובע וקרם הגנה בצהריים.')
    garments.push('sunHat')
  }

  return { when: date === today ? 'היום' : 'מחר', text: parts.join(' '), garments }
}
