import { THRESHOLDS as T } from '../config/thresholds'
import { conditionOf } from '../domain/conditions'
import { clockOf, hourOf } from '../domain/time'
import type { DayPoint, Forecast, LocalTime } from '../domain/types'
import { dominantSky, findDay, nextDate, windowFacts, type WindowFacts } from './facts'
import { limitSentences, rainContext } from './hazard'
import { normalClause } from './normal'
import { thresholdsFor } from './placeThresholds'
import {
  dayPartOf, dayTempWord, deg, DURING, joinClauses, nightTempWord, skyWith,
} from './phrases'

type PlaceThresholds = ReturnType<typeof thresholdsFor>
type RainContext = ReturnType<typeof rainContext>

function extremeHeat(day: DayPoint, w: WindowFacts, thresholds: PlaceThresholds): string | null {
  if (day.tempMax < thresholds.veryHot) return null
  const span = w.heatSpan
  const shade = span ? ` בין ${clockOf(span[0])} ל־${clockOf(span[1])} עדיף להישאר בצל.` : ''
  return `שרב, עד ${deg(day.tempMax)}.${shade}`
}

function windClause(w: WindowFacts, thresholds: PlaceThresholds): string | null {
  if (!w.peakWind) return null
  const part = DURING[dayPartOf(hourOf(w.peakWind.time))]
  if (w.peakWind.gusts >= thresholds.wind.gusts) return `${part} משבי רוח חזקים`
  if (w.peakWind.speed >= thresholds.wind.strong) return `${part} רוחות חזקות`
  if (w.peakWind.speed >= thresholds.wind.brisk) return `${part} רוח ערה`
  return null
}

function trendClause(f: Forecast, today: DayPoint, now: LocalTime): string | null {
  const morning = hourOf(now) < 11
  const ref = morning ? f.days[f.days.indexOf(today) - 1] : findDay(f, nextDate(f, today.date) ?? '')
  if (!ref) return null
  const delta = morning ? today.tempMax - ref.tempMax : ref.tempMax - today.tempMax
  if (Math.abs(delta) < T.trendDelta) return null
  if (morning) return delta > 0 ? 'חם יותר מאתמול' : 'קריר יותר מאתמול'
  return delta > 0 ? 'מחר התחממות' : 'מחר התקררות'
}

function composeDay(f: Forecast, today: DayPoint, now: LocalTime, rain: RainContext): string[] {
  const normal = f.normals?.[today.date]
  const thresholds = thresholdsFor(normal)
  const w = windowFacts(f, now, `${today.date}T23:59`, thresholds.heatHours)
  const heat = extremeHeat(today, w, thresholds)
  const risk = rain.hazard(w, 'היום')
  const sky = w.rainProb >= T.rain.possible ? 'rain' : dominantSky(w.hours, today.weatherCode)
  const tempWord = dayTempWord(today.tempMax)
  const lead = risk ? '' : `${conditionOf(f.current.weatherCode) === sky ? 'היום' : 'בהמשך היום'} `
  const temp = heat ?? `${lead}${sky === 'rain' ? tempWord : skyWith(sky, tempWord)}, עד ${deg(today.tempMax)}.`

  // Feels-like lives in the hero, so the sentence does not repeat it.
  const extras: string[] = []
  const anomaly = normalClause(today, normal)
  if (anomaly) extras.push(anomaly)
  const wind = windClause(w, thresholds)
  if (wind) extras.push(wind)
  if (w.pm10Max !== null && w.pm10Max >= T.dust.light && w.pm10Max < T.dust.heavy) extras.push('אובך קל')
  const trend = trendClause(f, today, now)
  if (trend) extras.push(trend)

  if (risk) return [risk, temp]
  const tail = extras.slice(0, 2)
  return tail.length ? [temp, `${joinClauses(tail)}.`] : [temp]
}

function composeNight(f: Forecast, now: LocalTime, context: RainContext): string[] {
  const nightDate = hourOf(now) < 5 ? now.slice(0, 10) : nextDate(f, now.slice(0, 10))
  const morning = nightDate ? findDay(f, nightDate) : undefined
  if (!morning) return []
  const w = windowFacts(f, now, morning.sunrise)
  const low = Math.min(...w.hours.map((h) => h.temperature), f.current.temperature)
  const t = context.afterStop(windowFacts(f, morning.sunrise, `${morning.date}T23:59`))
  const label = hourOf(now) < 5 ? 'היום' : 'מחר'
  const dayRisk = context.change?.kind === 'stop' ? context.hazard(t, label) : null
  const risk = context.hazard(w, 'הלילה') ?? dayRisk
  const first = risk ?? `הלילה ${nightTempWord(low)}, סביב ${deg(low)}.`
  const word = dayTempWord(morning.tempMax)
  const rain = dayRisk ? null : t.rainProb >= T.rain.likely ? 'צפוי גשם' : t.rainProb >= T.rain.possible ? 'ייתכן גשם' : null
  const body = rain ? `${rain} ו${word}` : skyWith(dominantSky(t.hours, morning.weatherCode), word)
  const anomaly = normalClause(morning, f.normals?.[morning.date])
  return [first, `${label} ${body}, עד ${deg(morning.tempMax)}${anomaly ? `, ${anomaly}` : ''}.`]
}

/** Up to three short Hebrew sentences, with any imminent rain change first. */
export function composeSummary(f: Forecast, now: LocalTime): string[] {
  const today = findDay(f, now.slice(0, 10))
  if (!today) return []
  const isDayMode = hourOf(now) >= 5 && now < today.sunset
  const rain = rainContext(f, now)
  const rest = isDayMode ? composeDay(f, today, now, rain) : composeNight(f, now, rain)
  return limitSentences(rain.lead ? [rain.lead, ...rest] : rest)
}
