import { THRESHOLDS as T } from '../config/thresholds'
import { conditionOf } from '../domain/conditions'
import { clockOf, hourOf } from '../domain/time'
import type { DayPoint, Forecast, LocalTime } from '../domain/types'
import { dominantSky, findDay, nextDate, windowFacts, type WindowFacts } from './facts'
import {
  dayPartOf, dayTempWord, deg, DURING, FROM, joinClauses, mm, nightTempWord, skyWith,
} from './phrases'

/** The hazard sentence (rain, heavy dust, extreme heat) or null. */
function hazard(w: WindowFacts, nowHour: number, when: string): string | null {
  if (w.pm10Max !== null && w.pm10Max >= T.dust.heavy) {
    return `אובך כבד ${when}, עדיף למעט בפעילות בחוץ.`
  }
  if (w.rainProb >= T.rain.possible) {
    const startHour = w.rainStart ? hourOf(w.rainStart) : nowHour
    const start = startHour <= nowHour + 1 ? 'בשעות הקרובות' : FROM[dayPartOf(startHour)]
    const amount = w.rainMm >= 1 ? `, כ־${mm(w.rainMm)}` : ''
    const flood = w.thunder || w.rainMm >= T.rain.floodMm ? '. חשש לשיטפונות בנחלים' : ''
    if (w.rainProb >= T.rain.heavy && w.rainMm >= T.rain.heavyMm) {
      return `גשם משמעותי ${start}${amount}${flood}.`
    }
    if (w.rainProb >= T.rain.likely) return `צפוי גשם ${start}${amount}${flood}.`
    return `ייתכן גשם מקומי ${start}${flood}.`
  }
  return null
}

function extremeHeat(day: DayPoint, w: WindowFacts): string | null {
  if (day.tempMax < T.dayTemp.veryHot) return null
  const span = w.heatSpan
  const shade = span ? ` בין ${clockOf(span[0])} ל־${clockOf(span[1])} עדיף להישאר בצל.` : ''
  return `שרב, עד ${deg(day.tempMax)}.${shade}`
}

function windClause(w: WindowFacts): string | null {
  if (!w.peakWind) return null
  const part = DURING[dayPartOf(hourOf(w.peakWind.time))]
  if (w.peakWind.gusts >= T.wind.gusts) return `${part} משבי רוח חזקים`
  if (w.peakWind.speed >= T.wind.strong) return `${part} רוחות חזקות`
  if (w.peakWind.speed >= T.wind.brisk) return `${part} רוח ערה`
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

function composeDay(f: Forecast, today: DayPoint, now: LocalTime): string[] {
  const w = windowFacts(f, now, `${today.date}T23:59`)
  const heat = extremeHeat(today, w)
  const risk = hazard(w, hourOf(now), 'היום')
  const sky = w.rainProb >= T.rain.possible ? 'rain' : dominantSky(w.hours, today.weatherCode)
  const tempWord = dayTempWord(today.tempMax)
  const lead = risk ? '' : `${conditionOf(f.current.weatherCode) === sky ? 'היום' : 'בהמשך היום'} `
  const temp = heat ?? `${lead}${sky === 'rain' ? tempWord : skyWith(sky, tempWord)}, עד ${deg(today.tempMax)}.`

  // Feels-like lives in the hero, so the sentence does not repeat it.
  const extras: string[] = []
  const wind = windClause(w)
  if (wind) extras.push(wind)
  if (w.pm10Max !== null && w.pm10Max >= T.dust.light && w.pm10Max < T.dust.heavy) extras.push('אובך קל')
  const trend = trendClause(f, today, now)
  if (trend) extras.push(trend)

  if (risk) return [risk, temp]
  const tail = extras.slice(0, 2)
  return tail.length ? [temp, `${joinClauses(tail)}.`] : [temp]
}

function composeNight(f: Forecast, now: LocalTime): string[] {
  const nightDate = hourOf(now) < 5 ? now.slice(0, 10) : nextDate(f, now.slice(0, 10))
  const morning = nightDate ? findDay(f, nightDate) : undefined
  if (!morning) return []
  const w = windowFacts(f, now, morning.sunrise)
  const low = Math.min(...w.hours.map((h) => h.temperature), f.current.temperature)
  const risk = hazard(w, hourOf(now), 'הלילה')
  const first = risk ?? `הלילה ${nightTempWord(low)}, סביב ${deg(low)}.`

  const t = windowFacts(f, morning.sunrise, `${morning.date}T23:59`)
  const word = dayTempWord(morning.tempMax)
  const rain = t.rainProb >= T.rain.likely ? 'צפוי גשם' : t.rainProb >= T.rain.possible ? 'ייתכן גשם' : null
  const label = hourOf(now) < 5 ? 'היום' : 'מחר'
  const body = rain ? `${rain} ו${word}` : skyWith(dominantSky(t.hours, morning.weatherCode), word)
  return [first, `${label} ${body}, עד ${deg(morning.tempMax)}.`]
}

/** One to two short Hebrew sentences describing the expected weather. */
export function composeSummary(f: Forecast, now: LocalTime): string[] {
  const today = findDay(f, now.slice(0, 10))
  if (!today) return []
  const isDayMode = hourOf(now) >= 5 && now < today.sunset
  return isDayMode ? composeDay(f, today, now) : composeNight(f, now)
}
