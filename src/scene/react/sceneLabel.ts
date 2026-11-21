import { airInput } from '../../atmo/airInput'
import { conditionLabel, conditionOf } from '../../domain/conditions'
import { clockOf } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { ltr, tempText } from '../../text/isolate'
import { nextSunEvent } from '../../world/twilight'
import type { WorldState } from '../../world/types'

type LabelWorld = Pick<WorldState, 'place' | 'bodies'>

/** The figure's spoken description: place, shown condition and temperature, sun state, and elevation. */
export function sceneLabel(world: LabelWorld, forecast: Forecast, now: LocalTime, selected: LocalTime | null): string {
  const shown = airInput(forecast, now, world.place, selected)
  const isDay = shown.preview ? world.bodies.sun.up : forecast.current.isDay
  const event = nextSunEvent(forecast.days, now)
  const elevation = Math.round(forecast.elevation)
  return [
    `${world.place.nameHe}, ${conditionLabel(conditionOf(shown.weatherCode), isDay)}, ${tempText(shown.temperature)}.`,
    world.bodies.sun.up && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${ltr(clockOf(event.time))}.` : '',
    elevation < 0
      ? `היישוב ${ltr(String(Math.abs(elevation)))} מטר מתחת לפני הים.`
      : `גובה היישוב ${ltr(String(elevation))} מטר.`,
  ].filter(Boolean).join(' ')
}
