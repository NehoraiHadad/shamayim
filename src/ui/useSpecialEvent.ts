import { useEffect, useState } from 'react'
import type { Place } from '../config/place'
import type { FarData } from '../data/city/farData'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Forecast, LocalTime } from '../domain/types'
import type { EventSurroundings } from '../events/sky'
import type { Detector, SpecialEvent } from '../events/types'
import { specialEventText } from '../text/specialEvent'

const QUARTER_HOUR = 15 * 60_000

/** The special event's line for the place, or null. Found after the page has painted, in its own chunk, on the device. */
export function useSpecialEvent(place: Place, forecast: Forecast | null, now: LocalTime, terrain: SceneTerrain,
  arrivalMs: number, cover: EventSurroundings['cover']): string | null {
  const [found, setFound] = useState<{ placeId: string; event: SpecialEvent | null } | null>(null)
  const [online, setOnline] = useState<readonly Detector[]>([])
  const [far, setFar] = useState<FarData | null>(null)
  const forecastAvailable = forecast !== null
  const refreshSlot = Math.floor(arrivalMs / QUARTER_HOUR)

  useEffect(() => {
    if (!forecastAvailable) return
    let current = true
    void import('../data/city/farData').then(({ loadFar }) => loadFar())
      .then((data) => { if (current) setFar(data) }).catch(() => undefined)
    return () => { current = false }
  }, [forecastAvailable])

  useEffect(() => {
    if (!forecastAvailable) return
    let current = true
    void import('../events/online').then(({ onlineDetectors }) => onlineDetectors(Date.now()))
      .then((detectors) => { if (current) setOnline(detectors) })
      .catch(() => { if (current) setOnline([]) })
    return () => { current = false }
  }, [forecastAvailable, refreshSlot])

  useEffect(() => {
    if (!forecast) return
    let current = true
    void import('../events').then(({ eventSky, specialEvent }) => {
      if (!current) return
      const sky = eventSky(place, forecast, now, terrain, { cover, far })
      setFound({ placeId: place.id, event: sky && specialEvent(sky, online) })
    }).catch(() => { if (current) setFound(null) /* The line is an extra: without its chunk there is none. */ })
    return () => { current = false }
  }, [place, forecast, now, terrain, cover, far, online])
  const event = forecast && found?.placeId === place.id ? found.event : null
  return event && event.when.to >= now ? specialEventText(event, now) : null
}
