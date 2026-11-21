import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import type { BoundsFile } from '../data/city/bounds'
import type { FarData } from '../data/city/farData'
import type { CityResult } from '../data/city/types'
import type { LandCover } from '../data/land/landData'
import type { LandData } from '../data/land/types'
import type { Landmark } from '../data/landmarks/types'
import type { CropArea } from '../data/landmarks/cropAreas'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { WaterMask } from '../data/water/waterMask'
import type { Camera } from '../domain/camera'
import type { WeightedSighting } from '../domain/cloudSightings'
import type { Forecast, LocalTime } from '../domain/types'
import type { LivingLand } from './landLiving'
import type { SkyLife } from './life'
import type { NightSky } from './nightSky'
import type { Optics } from './optics'
import type { PlaceEnv } from './placeEnv'
import type { SnowFall } from './snowLine'
import type { Air, Body, CloudLayer, CloudShadows, Light, MoonBody, Night, Rain, Snowfall, Wind, WorldRelief } from './typesAtmo'
import type { FarCities, OutsideView, PlaceUnknown, TerrainPlanes, WaterState, WorldLabels, WorldMark } from './typesLand'

export * from './typesAtmo'
export * from './typesLand'

/**
 * The world state: one description of the place at the shown minute, built once from the data (`buildWorld`), that
 * every element of the canvas scene answers to (docs/design/CANVAS-SCENE-PLAN.md §1a). Pure data: no DOM, no clock.
 * Positions are scene px at the reference width (`camera.width`, 375) unless a field says otherwise; colours are sRGB
 * 0–1; angles are degrees (azimuth clockwise from north).
 */

/** What `buildWorld` takes: what App already holds. */
export interface WorldInput {
  place: Place
  /** The forecast as App shows it (rolled forward, with the observed cloud and the visible sun). */
  forecast: Forecast
  now: LocalTime
  /** An hour picked in the strip (a preview), or null for now. */
  selected: LocalTime | null
  terrain: SceneTerrain
  /** Unused since 2026-11-20 (sun/moon judged on `drawnSkyline.ts`); kept for the turning view (`camera-fable.md`). */
  sunTerrain?: SceneTerrain
  /** Landmarks, the place's own homes and the satellite's groves (App's `marks`). */
  landmarks: readonly Landmark[]
  cropAreas?: readonly CropArea[]
  city?: CityResult | null
  /** The far raster (`far.json`: built share and storeys per ~0.5 km cell, towers of 80 m+); the far towns need it. */
  far?: FarData | null
  /** Single clouds the satellite sees near the place now (`sightingsNow`). */
  seenClouds?: readonly WeightedSighting[] | null
  /** The figure's width in px the marks are laid out for; 375 (the reference) when absent. */
  width?: number
  /** Dev overrides of the shown air (`?wx=`), applied as App applies them. */
  forced?: Partial<AirInput> | null
  /** Dev only (the harness's C10 moments): the cloud layers' covers (0–1) pinned, over the hour's. */
  forcedLayers?: { low: number; mid: number; high: number } | null
  /** The large water round Israel (`water.json`): a coastal place's own sea seen from outside (C5). */
  waterMask?: WaterMask | null
  /** The places' own boundaries (`bounds.json`): the outside view's frame is cut at them (C5). */
  bounds?: BoundsFile | null
  /** The land cover round the place (WorldCover, ~6 km): its built cells and trees (C5). */
  cover?: LandCover | null
  /** Living-land data bundle (`useLand`): WorldCover, near S2, far GIBS and recent weather; closures stay on the data side. */
  land?: LandData | null
}

/** Where a field came from when the forecast did not give it: fallbacks are marked, never silent. */
export interface WorldSources {
  cloudLayers: 'forecast' | 'thickCloud' | 'cover' | 'forced'
  rainCloudRaised: boolean
  windDirection: 'hour' | 'current' | 'forced'
  windAloft: 'forecast' | 'derived'
  visibility: 'hour' | 'current' | 'humidity' | 'default' | 'forced'
  cruise: 'forecast' | 'climate'
  glow: 'far' | 'cover' | 'population'
}

export interface WorldKeys {
  bodies: string; light: string; air: string; clouds: string; rain: string; wind: string
  terrain: string; water: string; farCities: string; place: string; marks: string
  night: string; ground: string; life: string; nightSky: string; optics: string; land: string
}

export interface WorldState {
  place: Place
  /** The shown minute (`selected ?? now`). */
  at: LocalTime
  /** A picked hour rather than now. */
  preview: boolean
  /** `hashId(place.id)`: every seeded choice starts from it. */
  seed: number
  camera: Camera
  relief: WorldRelief
  bodies: { sun: Body; moon: MoonBody }
  light: Light
  air: Air
  /** low, mid, high (in that order). */
  clouds: CloudLayer[]
  rain: Rain | null
  snow: SnowFall | null
  /** Snow falling now from the clouds (C7), or null. */
  snowfall: Snowfall | null
  wind: Wind
  terrain: TerrainPlanes
  water: WaterState
  farCities: FarCities
  place3: PlaceUnknown | OutsideView
  /** The marks after the portrait / outside rules (`marks.ts`), seated on the land they stand on. */
  marks: WorldMark[]
  /** The height label and the notes on the land (the place part: independent of the hour). */
  labels: WorldLabels
  night: Night
  ground: { wet: number; snowLineM: number | null }
  /** C10: the land round the place (sea, lakes, built and open ground, the towns' sky glow). */
  env: PlaceEnv
  /** C10: birds, aircraft and meteors at the shown hour. */
  life: SkyLife
  /** C10: the planets and the Milky Way. */
  nightSky: NightSky
  /** C10: the rainbow, the 22° halo and the sun dogs. */
  optics: Optics
  /** The living light: the low cloud's shadows on the land. */
  shadows: CloudShadows
  /** Living-land surface state sampled along panorama rays and over local ground for the shown date (structured-cloneable). */
  land: LivingLand
  cropAreas?: readonly CropArea[]
  sources: WorldSources
  keys: WorldKeys
}
