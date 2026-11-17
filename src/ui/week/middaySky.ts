import { THRESHOLDS as T } from '../../config/thresholds'
import { conditionOf, isWet, type ConditionKind } from '../../domain/conditions'
import type { DayPoint, Forecast } from '../../domain/types'
import { mix, ratio } from '../../theme/contrast'
import { skyPalette, type SkyPair } from './skyPalette'

/** Late morning to early afternoon: the sky a day is remembered by. */
const FROM_HOUR = 11
const TO_HOUR = 14
const WET_MM = 0.2
const WHITE = '#FFFFFF'
const DARK = '#1C1A17'

export interface DaySky {
  top: string
  low: string
  /** Icon ink on this sky: white, or dark on a pale (fog/snow) sky. */
  ink: string
  /** What to draw in the window. Wet, fog, snow and thunder days keep the day's own kind (it matters whenever it
   *  comes); dry days take the midday cloud, so the icon never says "overcast" over a clear midday sky. */
  kind: ConditionKind
  /** Dust over the light threshold at midday: the window draws a hazy sun instead of the icon. */
  hazy: boolean
}

const CLOUD_BY_KIND: Partial<Record<ConditionKind, number>> = { clear: 5, partly: 45, cloudy: 100 }

const DRY_KINDS: ConditionKind[] = ['clear', 'partly', 'cloudy']

function shownKind(dayKind: ConditionKind, cloud: number): ConditionKind {
  if (!DRY_KINDS.includes(dayKind)) return dayKind
  return cloud < 30 ? 'clear' : cloud < 70 ? 'partly' : 'cloudy'
}

const mixPair = (a: SkyPair, b: SkyPair, share: number): SkyPair => ({
  top: mix(a.top, b.top, share),
  low: mix(a.low, b.low, share),
})

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** The colour of a day's midday sky, from its hourly cloud cover, rain, dust and heat (daily code as a fallback). */
export function middaySky(day: DayPoint, f: Pick<Forecast, 'hours' | 'air'>): DaySky {
  const p = skyPalette()
  const inWindow = (time: string) => {
    if (!time.startsWith(day.date)) return false
    const h = Number(time.slice(11, 13))
    return h >= FROM_HOUR && h <= TO_HOUR
  }
  const hours = f.hours.filter((h) => inWindow(h.time))
  const kind = conditionOf(day.weatherCode)
  const kinds = hours.length ? hours.map((h) => conditionOf(h.weatherCode)) : [kind]
  const cloud = hours.length
    ? hours.reduce((s, h) => s + h.cloudCover, 0) / hours.length
    : (CLOUD_BY_KIND[kind] ?? 100)
  const wet = hours.length
    ? hours.some((h) => h.precipitation >= WET_MM || isWet(conditionOf(h.weatherCode)))
    : isWet(kind)
  const pm10 = Math.max(0, ...(f.air ?? []).filter((a) => inWindow(a.time)).map((a) => a.pm10 ?? 0))

  let sky: SkyPair
  if (kinds.some((k) => k === 'fog' || k === 'snow')) sky = p.pale
  else if (wet) sky = p.rain
  else {
    sky = mixPair(p.clear, p.overcast, clamp01(cloud / 100))
    if (day.tempMax >= T.dayTemp.hot && cloud < 50) sky = mixPair(sky, p.heat, 0.9)
  }
  if (pm10 >= T.dust.light) {
    sky = mixPair(sky, p.dust, clamp01(0.5 + (pm10 - T.dust.light) / (T.dust.heavy - T.dust.light) / 2))
  }
  const ink = Math.min(ratio(WHITE, sky.low), ratio(WHITE, sky.top)) >= 3 ? WHITE : DARK
  return { top: sky.top.toUpperCase(), low: sky.low.toUpperCase(), ink, kind: shownKind(kind, cloud), hazy: pm10 >= T.dust.light }
}
