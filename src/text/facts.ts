import { THRESHOLDS as T } from '../config/thresholds'
import { conditionOf, type ConditionKind } from '../domain/conditions'
import { hourOf } from '../domain/time'
import type { DayPoint, Forecast, HourPoint, LocalTime } from '../domain/types'

/** Weather facts for a time window, extracted from the forecast (pure). */
export interface WindowFacts {
  hours: HourPoint[]
  rainProb: number
  rainStart: LocalTime | null
  rainMm: number
  thunder: boolean
  peakWind: { speed: number; gusts: number; time: LocalTime } | null
  pm10Max: number | null
  heatSpan: [LocalTime, LocalTime] | null
}

export function hoursBetween(f: Forecast, from: LocalTime, to: LocalTime): HourPoint[] {
  const start = `${from.slice(0, 13)}:00`
  return f.hours.filter((h) => h.time >= start && h.time < to)
}

export function windowFacts(f: Forecast, from: LocalTime, to: LocalTime, heatHours: number = T.heatHours): WindowFacts {
  const hours = hoursBetween(f, from, to)
  const probs = hours.map((h) => h.precipProb ?? 0)
  const rainProb = probs.length ? Math.max(...probs) : 0
  const startRow = hours.find((h) => (h.precipProb ?? 0) >= T.rain.startHour)
    ?? hours.find((h) => (h.precipProb ?? 0) >= T.rain.possible)
  const rainMm = hours.reduce((s, h) => s + h.precipitation, 0)
  const thunder = hours.some((h) => h.weatherCode >= 95)
  const windiest = hours.reduce<HourPoint | null>(
    (best, h) => (!best || h.windGusts > best.windGusts ? h : best), null)
  const air = (f.air ?? []).filter((a) => a.time >= from.slice(0, 13) && a.time < to)
  const pm = air.map((a) => a.pm10).filter((v): v is number => v !== null)
  const hot = hours.filter((h) => h.temperature >= heatHours)
  return {
    hours,
    rainProb,
    rainStart: startRow?.time ?? null,
    rainMm,
    thunder,
    peakWind: windiest
      ? { speed: Math.max(...hours.map((h) => h.windSpeed)), gusts: windiest.windGusts, time: windiest.time }
      : null,
    pm10Max: pm.length ? Math.max(...pm) : null,
    heatSpan: hot.length ? [hot[0].time, hot[hot.length - 1].time] : null,
  }
}

/** Most representative sky for a set of daylight hours (ignores precipitation kinds). */
export function dominantSky(hours: HourPoint[], fallbackCode: number): ConditionKind {
  const day = hours.filter((h) => hourOf(h.time) >= 8 && hourOf(h.time) <= 17)
  if (!day.length) return conditionOf(fallbackCode)
  const cover = day.reduce((s, h) => s + h.cloudCover, 0) / day.length
  if (day.some((h) => conditionOf(h.weatherCode) === 'fog') && cover < 50) return 'fog'
  if (cover < 25) return 'clear'
  if (cover < 70) return 'partly'
  return 'cloudy'
}

export function findDay(f: Forecast, date: string): DayPoint | undefined {
  return f.days.find((d) => d.date === date)
}

export function nextDate(f: Forecast, date: string): string | undefined {
  const i = f.days.findIndex((d) => d.date === date)
  return i >= 0 ? f.days[i + 1]?.date : undefined
}
