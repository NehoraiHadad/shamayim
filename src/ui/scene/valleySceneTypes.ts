import type { AirState } from '../../atmo/airTypes'
import type { Place } from '../../config/place'
import type { CityResult } from '../../data/city/types'
import type { Landmark, MarkLife } from '../../data/landmarks/types'
import type { SceneTerrain } from '../../data/terrain/terrain'
import type { WeightedSighting } from '../../domain/cloudSightings'
import type { Forecast, LocalTime } from '../../domain/types'
import type { SnowFall } from '../../world/snowLine'
import type { RidgeLightInput } from './useRidgeLighting'

export interface ValleySceneProps {
  forecast: Forecast
  now: LocalTime
  /** An hour picked in the strip; the sun moves there. */
  selected: LocalTime | null
  lat: number
  /** Shown in place of the next sun event while an hour is selected. */
  readout?: string | null
  /** The air being shown (now or the selected hour): haze, dust coin, heat shimmer, cloud veil. */
  air: AirState
  /** Cloud cover of the shown hour, 0–100. */
  cloudCover: number
  /** The cloud the moon is veiled by (`moonCloud`: low and mid cloud when known); the whole cover when absent. */
  moonCloud?: number
  /** 2.5D sun lighting for the ridges, marks, disc and air (off with `?scene=flat`). */
  ridgeLight?: RidgeLightInput
  /** Snow falling in the shown hour (null on any other day): white caps above its snow line. */
  snow?: SnowFall | null
  terrain: SceneTerrain
  /**
   * The land the sun's rising, setting and light are judged against when the view turns: the place's south panorama,
   * which always holds the sun's path. Absent: `terrain`.
   */
  sunTerrain?: SceneTerrain
  /** Still morning mist, layered between the two ridge paths. */
  mist?: number
  mistColor?: string
  place: Place
  landmarks: Landmark[]
  city?: CityResult | null
  markLife: MarkLife
  first: LocalTime
  last: LocalTime
  onScrub: (time: LocalTime) => void
  onRelease: () => void
  onNow: () => void
  /** Single clouds the satellite sees near the place right now (none while another hour is shown). */
  seenClouds?: WeightedSighting[] | null
}
