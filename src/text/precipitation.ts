import { conditionOf, isWet, type ConditionKind } from '../domain/conditions'
import type { DayPoint, HourPoint } from '../domain/types'
import { formatProb } from './format'
import { ltr } from './isolate'

export type PrecipitationLabel = 'גשם' | 'שלג' | 'גשם ושלג' | 'משקעים'

export function precipitationLabel(kind: ConditionKind): PrecipitationLabel {
  if (kind === 'snow') return 'שלג'
  return isWet(kind) ? 'גשם' : 'משקעים'
}

/** The daily code can represent the day's strongest condition and omit the other precipitation type. */
export function dailyPrecipitationLabel(day: DayPoint, hours: readonly HourPoint[]): PrecipitationLabel {
  const daily = precipitationLabel(conditionOf(day.weatherCode))
  let rain = daily === 'גשם'
  let snow = daily === 'שלג'
  for (const hour of hours) {
    if (!hour.time.startsWith(day.date)) continue
    const label = precipitationLabel(conditionOf(hour.weatherCode))
    rain ||= label === 'גשם'
    snow ||= label === 'שלג'
  }
  if (rain && snow) return 'גשם ושלג'
  if (rain) return 'גשם'
  return snow ? 'שלג' : 'משקעים'
}

export function precipitationChance(label: PrecipitationLabel, probability: number): string {
  const type = label === 'משקעים' || label === 'גשם ושלג' ? 'למשקעים' : `ל${label}`
  const chance = `סיכוי ${type} ${ltr(formatProb(probability))}`
  return label === 'גשם ושלג' ? `${label}, ${chance}` : chance
}
