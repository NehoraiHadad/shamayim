import type { HourPoint, LocalTime } from '../../domain/types'
import type { Covers } from '../clouds'
import type { FieldWeather } from '../../atmo/fieldWeather'

/** Independent air frames in the field. */
export type Lattice = 'low' | 'tower' | 'mid' | 'high'

/** Cloud genera used for physical dimensions and painting. */
export type Genus = 'cu' | 'cg' | 'cb' | 'sc' | 'st' | 'ac' | 'as' | 'ns' | 'ci' | 'cs'

/** Continuous form weights in [0, 1]. */
export interface LayerForm {
  conv: number
  strat: number
  sheet: number
  veil: number
  stratus?: number
  nimbostratus?: number
}

/** Layer-wide parameters with heights above the eye. */
export interface FieldLayer {
  lattice: Lattice
  baseKm: number
  meanVKm: number
  cover: number
  /** Occupied site fraction. */
  Q: number
  /** Radius multiplier. */
  g: number
  meanExtinction?: number
  floorTau: number
  kappa: number
  form: LayerForm
  lowBaseKm?: number
  derived?: boolean
  motionAt?: (minute: number) => Pick<FieldLayer, 'd' | 'vel'>
  dayMotion?: (minute: number, midnight: number) => Pick<FieldLayer, 'd' | 'vel'>
  d: [eastKm: number, northKm: number]
  vel: [eastKmPerMin: number, northKmPerMin: number]
}

/** A cloud disc with east/north coordinates, radius and heights in km. */
export interface FieldCell {
  id: number | string
  lattice: Lattice
  x: number
  y: number
  r: number
  baseKm: number
  vKm: number
  tau0: number
  /** Relative precipitation potential in [0, 1]. */
  rainWeight: number
  share: number
  seed: number
  genus: Genus
  rank: number
  /** Minor semi-axis in km and major-axis bearing in degrees clockwise from north. */
  rMinor?: number
  axis?: number
}

/** Field at a local wall-time minute. */
export interface CloudField {
  placeId: string
  t: number // minutes
  layers: FieldLayer[]
  rain?: FieldInput['rain']
}

export type FieldRain = { level: 'low' | 'mid' | 'high'; rate: number; midWeight?: number }
export type FieldMotion = (index: number, minute: number) => Pick<FieldLayer, 'd' | 'vel'>

/** Weather and observer inputs for one field snapshot. */
export interface FieldInput {
  placeId: string
  hours: readonly HourPoint[]
  at: LocalTime
  covers: Covers
  lowBaseKm: number
  elevationKm: number
  weatherCode?: number
  weatherForced?: boolean
  weather?: FieldWeather
  rain?: FieldRain
  motion?: FieldMotion
  /** Solar altitude in degrees. */
  sunAltitude: number
  wind10: { speedKmh: number; fromDeg: number }
}
