import { clockOf } from '../../domain/time'
import type { Forecast, LocalTime } from '../../domain/types'
import { nextSunEvent } from '../../world/twilight'
import type { WorldState } from '../../world/types'

/** The figure's spoken description, as the SVG scene gives it. */
export function sceneLabel(world: WorldState, forecast: Forecast, now: LocalTime, selected: LocalTime | null) {
  const event = nextSunEvent(forecast.days, now)
  const elevation = Math.round(forecast.elevation)
  return [
    world.bodies.sun.up && !selected ? 'השמש מעל האופק.' : '',
    event ? `${event.rise ? 'זריחה' : 'שקיעה'} ב־${clockOf(event.time)}.` : '',
    elevation < 0 ? `היישוב ${Math.abs(elevation)} מטר מתחת לפני הים.` : `גובה היישוב ${elevation} מטר.`,
  ].filter(Boolean).join(' ')
}
