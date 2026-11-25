import { THRESHOLDS as T } from '../config/thresholds'
import { conditionOf, isWet } from '../domain/conditions'
import { clockOf, hourOf } from '../domain/time'
import type { HourPoint, LocalTime } from '../domain/types'
import type { WindowFacts } from './facts'
import { ltr } from './isolate'
import { dayPartOf, DURING } from './phrases'
import type { Garment } from './wear'

export interface RainGear {
  text: string
  garment: Garment | null
}

/** "בצהריים", "בבוקר ובערב", or the whole day when it spans more parts than are worth listing. */
function partsOf(hours: HourPoint[]): string {
  const parts = [...new Set(hours.map((h) => DURING[dayPartOf(hourOf(h.time))]))]
  return parts.length > 2 ? 'לאורך היום' : parts.join(' ו')
}

/** What to take for the rain or snow of a window, and when it comes. `hasCoat`: the layers already name a coat. */
export function rainGear(facts: WindowFacts, hasCoat: boolean, now?: LocalTime): RainGear | null {
  if (facts.rainProb < T.rain.possible) return null
  const likely = facts.rainProb >= T.rain.likely
  const floor = likely ? T.rain.startHour : T.rain.possible
  const hours = facts.hours.filter((h) => (h.precipProb ?? 0) >= floor)
  const when = partsOf(hours)
  const kinds = hours.map((h) => conditionOf(h.weatherCode))
  if (kinds.includes('snow') && !kinds.some(isWet)) {
    const snow = `${likely ? 'צפוי' : 'ייתכן'} שלג ${when}`
    return hasCoat
      ? { text: `${snow}, כדאי נעליים אטומות.`, garment: null }
      : { text: `${snow}, קחו מעיל ונעליים אטומות.`, garment: 'coat' }
  }
  const start = hours[0]?.time
  const rainWhen = now && start && start > now ? `בסביבות ${ltr(clockOf(start))}` : when
  return likely
    ? { text: `קחו מטרייה, גשם צפוי ${rainWhen}.`, garment: 'umbrella' }
    : { text: `כדאי מעיל גשם קל בתיק, ייתכן גשם ${rainWhen}.`, garment: 'rainJacket' }
}
