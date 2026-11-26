import { airInput } from '../../atmo/airInput'
import type { AirInput } from '../../atmo/airTypes'
import { conditionLabel, conditionOf, isWet, type ConditionKind } from '../../domain/conditions'
import { clockOf } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { ltr, tempText } from '../../text/isolate'
import { rainRate } from '../../world/airParts'
import { nextSunEvent } from '../../world/twilight'
import type { WorldState } from '../../world/types'

type LabelWorld = Pick<WorldState, 'place' | 'bodies'> & Partial<Pick<WorldState, 'rain' | 'snowfall' | 'clouds'>>

/** Derive the spoken condition from the same precip, snow and cloud values the scene renders. */
function renderedCondition(shown: AirInput, world: LabelWorld, hasLightning: boolean): ConditionKind {
  if (hasLightning) return 'thunder'
  const codeKind = conditionOf(shown.weatherCode)
  const snowing = world.snowfall !== undefined
    ? Boolean(world.snowfall)
    : codeKind === 'snow' || (shown.snowfall > 0 && shown.temperature <= 2)
  if (snowing) return 'snow'

  const rate = world.rain !== undefined ? (world.rain?.rateMmH ?? 0) : rainRate(shown)
  if (rate > 0) {
    if (isWet(codeKind) && codeKind !== 'thunder') return codeKind
    return rate < 0.5 ? 'drizzle' : 'rain'
  }
  if (codeKind === 'fog') return 'fog'

  if (!shown.preview && (codeKind === 'snow' || (isWet(codeKind) && codeKind !== 'thunder'))) return codeKind
  const cover = world.clouds
    ? (1 - world.clouds.reduce((clear, layer) => clear * (1 - layer.cover), 1)) * 100
    : shown.cloudCover
  return conditionOf(0, cover)
}

/** The figure's spoken description: place, shown condition and temperature, sun state, and elevation. */
export function sceneLabel(world: LabelWorld, forecast: Forecast, now: LocalTime, selected: LocalTime | null,
  { temperature, hasLightning }: { temperature: number; hasLightning: boolean }): string {
  const shown = airInput(forecast, now, world.place, selected)
  const isDay = world.bodies.sun.up
  const event = nextSunEvent(forecast.days, selected ?? now)
  const elevation = Math.round(forecast.elevation)
  return [
    `${world.place.nameHe}, ${conditionLabel(renderedCondition(shown, world, hasLightning), isDay)}, ${tempText(temperature)}.`,
    world.bodies.sun.up && shown.live ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${ltr(clockOf(event.time))}.` : '',
    elevation < 0
      ? `היישוב ${ltr(String(Math.abs(elevation)))} מטר מתחת לפני הים.`
      : `גובה היישוב ${ltr(String(elevation))} מטר.`,
  ].filter(Boolean).join(' ')
}
