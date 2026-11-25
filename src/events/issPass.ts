import { issPosition, usableIssOrbit, type IssOrbit } from '../astro/iss'
import { apparentAltitude } from '../world/skyProjection'
import type { Candidate, Detector } from './types'

export { loadIssOrbit } from '../data/issOrbit'

const MINUTE = 60_000
const STEP = 10_000
const SEARCH_STEP = 3 * STEP
const SUN_BELOW = apparentAltitude(-6) // The end of civil twilight, in EventSky's apparent coordinates.
const LOWEST = 10
const PEAK = 20

/** The lit portions of good ISS passes. The shared viewing rule accounts for land and forecast clouds. */
export const issPasses = (orbit: IssOrbit): Detector => (sky) => {
  if (!usableIssOrbit(orbit, sky.from)) return []
  const at = (ms: number) => {
    const position = issPosition(orbit, sky.place, ms)
    if (!position?.sunlit || position.altitude < LOWEST) return null
    return { azimuth: position.azimuth, altitude: apparentAltitude(position.altitude) }
  }
  const visible = (ms: number) => sky.sunAt(ms).altitude < SUN_BELOW ? at(ms) : null
  const candidates: Candidate[] = []
  let from: number | null = null, peak = 0
  const finish = (to: number) => {
    if (from !== null && to >= sky.from && peak >= PEAK) {
      candidates.push({ what: 'מעבר תחנת החלל הבין־לאומית', perYear: 80, from, to, at, tell: 'span', track: true,
        stepMin: STEP / MINUTE, leastMin: 1, sunBelow: SUN_BELOW, cloud: { thick: 0.6, all: 0.85 } })
    }
    from = null
    peak = 0
  }
  // Include enough of an ongoing pass to find its peak, even when it is already descending.
  const start = Math.max(sky.night.from, sky.from - 10 * MINUTE)
  const first = Math.ceil(start / STEP) * STEP
  for (let ms = first; ms <= sky.to; ms += from === null ? SEARCH_STEP : STEP) {
    const look = visible(ms)
    if (look) {
      // A pass worth a minute is caught by the coarser search. Recover its start on the finer grid.
      if (from === null) {
        from = ms - STEP
        for (let early = ms - STEP; early >= first && early > ms - SEARCH_STEP; early -= STEP) {
          const earlier = visible(early)
          if (!earlier) break
          from = early - STEP
          peak = Math.max(peak, earlier.altitude)
        }
      }
      peak = Math.max(peak, look.altitude)
    } else if (from !== null) finish(ms)
  }
  if (from !== null) finish(sky.to)
  return candidates
}
