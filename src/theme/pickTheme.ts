import { THRESHOLDS as T } from '../config/thresholds'
import { conditionOf, isWet } from '../domain/conditions'
import { minutesBetween } from '../domain/time'
import type { DayPoint, Forecast, LocalTime } from '../domain/types'
import type { ThemeId } from './skyThemes'

const TWILIGHT_MIN = 40
const HEAT_THEME_FROM = 36

function currentPm10(f: Forecast, now: LocalTime): number | null {
  const key = `${now.slice(0, 13)}:00`
  return f.air?.find((a) => a.time === key)?.pm10 ?? null
}

/** Priority: dust → rain → (twilight) → night → heat → cloudy → clear. */
export function pickTheme(f: Forecast, today: DayPoint | undefined, now: LocalTime): ThemeId {
  const kind = conditionOf(f.current.weatherCode, f.current.cloudCover)
  const pm10 = currentPm10(f, now)
  const isDay = today ? now >= today.sunrise && now < today.sunset : f.current.isDay

  if (isDay && pm10 !== null && pm10 >= T.dust.light) return 'dust'
  if (isWet(kind)) return 'rain'
  if (today) {
    const sinceRise = minutesBetween(today.sunrise, now)
    const toSet = minutesBetween(now, today.sunset)
    if (sinceRise >= -15 && sinceRise < TWILIGHT_MIN) return 'dawn'
    if (toSet > -25 && toSet <= TWILIGHT_MIN) return 'dusk'
  }
  if (!isDay) return 'night'
  if (f.current.temperature >= HEAT_THEME_FROM) return 'heat'
  if (f.current.cloudCover >= 70 || kind === 'cloudy' || kind === 'fog') return 'cloudy'
  return 'clearDay'
}
