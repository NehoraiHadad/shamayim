import type { AirInput, AirState } from '../airTypes'
import { clamp } from '../mapParts'
import type { EventKind, LifeState } from './types'

export function hashSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mmdd = (date: string) => date.slice(5, 10)
const inRange = (day: string, from: string, to: string) => day >= from && day <= to
const inRanges = (day: string, ranges: [string, string][]) => ranges.some(([a, b]) => inRange(day, a, b))

function mistAmount(i: AirInput, air: AirState): number {
  if (i.humidity === null || i.localHour >= 12 || i.sunElevation < -6 || i.precipitation > 0 ||
      air.rain.count + air.snow.count > 0 || air.haze.nearFade >= 0.3) return 0
  return clamp((i.humidity - 85) / 10) * clamp((10 - i.windSpeed) / 5) * clamp((14 - i.sunElevation) / 8)
}

function isQuiet(i: AirInput, air: AirState): boolean {
  const moving = air.rain.count + air.snow.count + air.grains.count + air.streaks.count
  const systems = Number(air.heat.band > 0) + Number(air.rays.alpha > 0)
  return moving === 0 && !air.thunder && air.wind.gustExcess === 0 && air.haze.farFade <= 0.6 &&
    systems <= 1 && !i.preview
}

export function mapLife(i: AirInput, air: AirState): LifeState {
  const day = mmdd(i.date)
  const month = Number(day.slice(0, 2))
  const seed = hashSeed(`${i.date}${Math.floor(i.localHour)}`)
  const dir: 1 | -1 = i.windSpeed >= 5 && Math.abs(air.wind.u) >= 0.35
    ? (air.wind.u >= 0 ? 1 : -1)
    : (seed & 1 ? 1 : -1)
  const eligible: EventKind[] = []
  if (isQuiet(i, air)) {
    if (inRanges(day, [['08-15', '09-30'], ['03-10', '04-30']]) && i.sunElevation >= 25 && i.temperature >= 18 && i.cloudCover < 70) eligible.push('storks')
    if (inRanges(day, [['10-10', '11-30'], ['02-15', '03-20']]) && i.sunElevation >= 8 && i.cloudCover < 85) eligible.push('cranes')
    if (inRange(day, '03-01', '06-30') && i.sunElevation >= 2 && i.sunElevation <= 22 && i.temperature >= 16 && i.windSpeed < 15) eligible.push('swifts')
    if (i.sunElevation >= 40 && i.temperature >= 28 && i.cloudCover < 50) eligible.push('raptor')
    const showers: [string, string][] = [['01-03', '01-04'], ['04-21', '04-23'], ['05-05', '05-07'], ['08-11', '08-13'], ['10-20', '10-22'], ['11-17', '11-18'], ['12-13', '12-14']]
    if (inRanges(day, showers) && i.sunElevation <= -12 && i.cloudCover < 20) eligible.push('meteor')
  }
  const starFactor = 1 - 0.9 * i.cloudCover / 100
  const wind = clamp(i.windSpeed / 20)
  return {
    mist: mistAmount(i, air),
    twinkle: i.sunElevation <= -10 && starFactor >= 0.4 ? { amp: 0.25 + 0.3 * wind, period: 5.2 - 2.4 * wind } : null,
    eligible,
    dir,
    autumn: month >= 7,
    seed,
    input: { date: i.date, localHour: i.localHour },
  }
}
