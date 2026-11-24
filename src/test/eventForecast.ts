import { sunPosition } from '../astro/sun'
import { utcOf } from '../astro/utc'
import type { Place } from '../config/place'
import { terrainForPlace } from '../data/terrain/terrain'
import { addMinutes } from '../domain/minutes'
import type { DayPoint, Forecast, HourPoint, LocalDate, LocalTime } from '../domain/types'
import { eventSky } from '../events'

/** Tel Aviv, with the horizon open all round. */
export const PLACE: Place = { id: 'tel-aviv', nameHe: 'תל אביב', regionHe: 'גוש דן', lat: 32.08, lon: 34.78, timezone: 'Asia/Jerusalem',
  population: 1500 }

/** When the sun crosses the horizon between two local hours (to the minute). */
function crossing(date: LocalDate, fromHour: number, place: Place): LocalTime {
  const up = (minute: number) => sunPosition(utcOf(addMinutes(`${date}T00:00`, minute), place.timezone), place.lat, place.lon).altitude > -0.83
  let lo = 60 * fromHour, hi = lo + 12 * 60
  const start = up(lo)
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (up(mid) === start) lo = mid
    else hi = mid
  }
  return addMinutes(`${date}T00:00`, hi)
}

/** A forecast for the day before to the day after a date, with the same weather every hour (clear when not given). */
export function eventForecast(date: LocalDate, weather: (hour: number) => Partial<HourPoint> = () => ({}), place = PLACE): Forecast {
  const dates = [-1, 0, 1, 2].map((d) => addMinutes(`${date}T00:00`, d * 1440).slice(0, 10))
  const days = dates.map((d) => ({ date: d, sunrise: crossing(d, 1, place), sunset: crossing(d, 12, place) }) as DayPoint)
  const hours = dates.flatMap((d) => Array.from({ length: 24 }, (_, h) => ({ time: `${d}T${String(h).padStart(2, '0')}:00`, temperature: 20,
    precipProb: 0, precipitation: 0, weatherCode: 0, cloudCover: 0, windSpeed: 5, windGusts: 8, humidity: 50, snowDepth: 0,
    ...weather(h) }) satisfies HourPoint))
  return { days, hours } as unknown as Forecast
}

/** The sky over the open place at a local time. */
export const openSky = (now: LocalTime, weather?: (hour: number) => Partial<HourPoint>, place = PLACE) =>
  eventSky(place, eventForecast(now.slice(0, 10), weather, place), now, terrainForPlace(null, 'offline'))!
