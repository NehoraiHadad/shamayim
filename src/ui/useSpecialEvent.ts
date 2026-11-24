import { useEffect, useState } from 'react'
import type { Place } from '../config/place'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Forecast, LocalTime } from '../domain/types'
import type { SpecialEvent } from '../events/types'
import { specialEventText } from '../text/specialEvent'

/** The special event's line for the place, or null. Found after the page has painted, in its own chunk, on the device. */
export function useSpecialEvent(place: Place, forecast: Forecast | null, now: LocalTime, terrain: SceneTerrain): string | null {
  const [found, setFound] = useState<{ placeId: string; event: SpecialEvent | null } | null>(null)
  useEffect(() => {
    if (!forecast) return
    let current = true
    void import('../events').then(({ eventSky, specialEvent }) => {
      if (!current) return
      const sky = eventSky(place, forecast, now, terrain)
      setFound({ placeId: place.id, event: sky && specialEvent(sky) })
    }).catch(() => { if (current) setFound(null) /* The line is an extra: without its chunk there is none. */ })
    return () => { current = false }
  }, [place, forecast, now, terrain])
  return forecast && found?.placeId === place.id && found.event ? specialEventText(found.event, now) : null
}
