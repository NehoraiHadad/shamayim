import { useMemo } from 'react'
import { sightingsNow } from '../../domain/cloudSightings'
import type { CloudObservation } from '../../domain/observedCloud'
import type { LocalTime } from '../../domain/types'
import { forcedSightings } from '../devParams'

/** Show individual satellite clouds only in the live scene. */
export function useSceneSightings(weather: { live: boolean; cloudCover: number } | null,
  observedCloud: CloudObservation | null, now: LocalTime, arrivalMs?: number) {
  return useMemo(() => {
    if (!weather?.live) return { seenClouds: [], cloudsSeen: 0 }
    const pinned = forcedSightings()
    const seenClouds = pinned ? pinned.map((s) => ({ ...s, strength: 1 }))
      : sightingsNow(observedCloud, now, weather.cloudCover, arrivalMs)
    return { seenClouds, cloudsSeen: seenClouds.length }
  }, [weather, observedCloud, now, arrivalMs])
}
