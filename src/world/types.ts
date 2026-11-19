import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import type { OutsideFrame, OutsideSkyline } from '../data/city/outsideView'
import type { CityResult } from '../data/city/types'
import type { SettlementSize, SettlementStyle } from '../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../data/landmarks/types'
import type { Relief } from '../data/terrain/angleScale'
import type { SceneNote } from '../data/terrain/sceneNotes'
import type { SceneTerrain } from '../data/terrain/terrain'
import type { Glint, WaterLight } from '../data/water/glint'
import type { WaterSpan } from '../data/water/waterInView'
import type { Camera } from '../domain/camera'
import type { WeightedSighting } from '../domain/cloudSightings'
import type { Forecast, LocalTime } from '../domain/types'
import type { SkyLight } from '../theme/skyLight'
import type { PlaneFace } from './face'
import type { LandForm } from './land'
import type { SnowFall } from './snowLine'

/**
 * The world state: one description of the place at the shown minute, built once from the data (`buildWorld`), that
 * every element of the canvas scene answers to (docs/design/CANVAS-SCENE-PLAN.md §1a). Pure data: no DOM, no clock.
 * Positions are scene px at the reference width (`camera.width`, 375) unless a field says otherwise; colours are sRGB
 * 0–1; angles are degrees (azimuth clockwise from north).
 */

export type RGB = readonly [number, number, number]
export type Pt = readonly [number, number]

/** What `buildWorld` takes: what App already holds. */
export interface WorldInput {
  place: Place
  /** The forecast as App shows it (rolled forward, with the observed cloud and the visible sun). */
  forecast: Forecast
  now: LocalTime
  /** An hour picked in the strip (a preview), or null for now. */
  selected: LocalTime | null
  terrain: SceneTerrain
  /** The land the sun is judged against when it differs from the view's (a turning view); absent: `terrain`. */
  sunTerrain?: SceneTerrain
  /** Landmarks, the place's own homes and the satellite's groves (App's `marks`). */
  landmarks: readonly Landmark[]
  city?: CityResult | null
  /** Single clouds the satellite sees near the place now (`sightingsNow`). */
  seenClouds?: readonly WeightedSighting[] | null
  /** The figure's width in px the marks are laid out for; 375 (the reference) when absent. */
  width?: number
  /** Dev overrides of the shown air (`?wx=`), applied as App applies them. */
  forced?: Partial<AirInput> | null
}

/** Where a field came from when the forecast did not give it: fallbacks are marked, never silent. */
export interface WorldSources {
  /** Cloud layers: the forecast's own, split from `thickCloud` and the cover, or from the cover alone. */
  cloudLayers: 'forecast' | 'thickCloud' | 'cover'
  /** The low layer was raised so the forecast's rain has a cloud to fall from. */
  rainCloudRaised: boolean
  windDirection: 'hour' | 'current' | 'forced'
  /** Wind at cloud heights: the forecast's (850/700/300 hPa) or ×1.4 / ×2 / ×3 the 10 m wind. */
  windAloft: 'forecast' | 'derived'
  visibility: 'hour' | 'current' | 'humidity' | 'default' | 'forced'
}

/** Angle → y, shared by land and sky: the vertical scale (`RELIEF`) above eye level. */
export interface WorldRelief {
  scale: Relief
  /** y of eye level (0°): the panorama's, or the old fixed horizon for the drawn stand-in. */
  horizonY: number
  /** y of an (apparent) altitude above eye level. */
  y: (altitude: number) => number
}

export interface Body {
  azimuth: number
  /** True altitude (deg). */
  altitude: number
  /** Where it is drawn (scene px): its arc over the land, as the SVG scene places it. */
  x: number
  y: number
  /** Above the flat horizon (refraction and the disc's radius counted). */
  up: boolean
  /** Above the land in its own direction (behind a ridge it is up but not over the land). */
  overLand: boolean
}

export interface MoonBody extends Body {
  /** 0 new … 0.5 full … 1 new (synodic phase). */
  phase: number
  /** Lit fraction of the disc, 0–1. */
  illumination: number
  /** Screen angle (deg) from the moon toward the sun: the lit limb faces it. */
  tilt: number
}

export interface Light {
  /** sky: overcast, twilight or night with no direct light worth a shadow side. */
  source: 'sun' | 'moon' | 'sky'
  /** Of the source (the sun's for 'sky'). */
  azimuth: number
  altitude: number
  /** Screen side the light comes from (`lateral` of its azimuth through the camera); null for 'sky' or straight on. */
  side: 'left' | 'right' | null
  /** The light's direction in drawn space, [across, up], as the ridge lighting takes it; null for 'sky'. */
  ray: [number, number] | null
  /** Direct light after air mass and aerosol (`sceneLight.ts`); the moon's is cool and dim. */
  colour: RGB
  /** 0–1: over the land, through the haze, dimmed by the cloud between the eye and the source. */
  direct: number
  /** Sky light on shade faces (the sky's mid tone). */
  ambient: RGB
  /** Cast shadows: `dx` across per unit of height (−1…1, away from the light), length per unit of height, softness 1 = none. */
  shadow: { dx: number; length: number; softness: number }
  /** Toward noon (1) the light comes from above and the faces even out (`ridgeLighting.ts`). */
  noonWeight: number
  /** Where the crest rim is lit (scene px): under the sun, or under the twilight glow; null when nothing is. */
  rimX: number | null
  /** The glow behind the ridge round sunrise and sunset (`twilight.ts`), where the sun crosses the land. */
  glow: { side: 'east' | 'west'; opacity: number; x: number; y: number } | null
  /** Clouds still lit after sunset / before sunrise (`afterglow.ts`). */
  afterglow: { x: number; altitude: number; rgb: RGB } | null
  /** The sky's palette at this light (`theme/skyLight.ts`), the tones the ridge tones are mixed from. */
  palette: SkyLight
}

export interface Air {
  /** Horizontal visibility (km, 1–40), dust folded in. */
  visibilityKm: number
  humidity: number | null
  dust: boolean
  /** The colour far planes fade toward. */
  haze: RGB
  /** Aerial perspective: 0 near … 1 lost, Koschmieder from `visibilityKm` (contrast 2 % at the visibility). */
  fade: (km: number) => number
  /** The SVG scene's fades of the far and near planes (`atmo/mapParts.ts`), for tones carried over. */
  farFade: number
  nearFade: number
  horizonBand: { rgb: RGB; alpha: number }
  /** Heat shimmer amplitude (px). */
  heat: number
}

export type CloudLevel = 'low' | 'mid' | 'high'

export interface CloudBank {
  id: string
  azimuth: number
  /** Altitude (deg) of the bank's base as seen from the place. */
  altitude: number
  /** Angular width and height (deg). */
  w: number
  h: number
  distanceKm: number
  puffs: number
  seed: number
  /** A cloud the satellite saw near the place (`cloudSightings.ts`). */
  seen?: boolean
}

export interface CloudLayer {
  level: CloudLevel
  /** 0–1 of the sky. */
  cover: number
  baseM: number
  /** Seeded banks round the whole horizon (not only the view), so rain and edge marks keep their true direction. */
  banks: CloudBank[]
  /** Scene px/s across, signed like `wind.across`, from the wind at this level. */
  drift: number
  /** 0–1: a low sun lights the undersides. */
  litUnderside: number
  /** This layer makes the rain. */
  rains: boolean
}

export interface RainCell { fromAzimuth: number; toAzimuth: number; bank: string }

export interface Rain {
  rateMmH: number
  /** Under the raining layer's banks, at their true azimuths. */
  cells: RainCell[]
  /** Rad from vertical, signed like `wind.across` (rain falls toward where the wind goes). */
  slant: number
  thunder: boolean
}

export interface Wind {
  /** Where the 10 m wind comes from (deg) and where it goes. */
  fromDeg: number
  towardDeg: number
  ms: number
  gustMs: number
  /** −1…1: + moves left → right on screen (camera-aware: the direction it goes, through `lateral`). */
  across: number
  /** m/s at each cloud level. */
  aloft: Record<CloudLevel, number>
  /** Across (−1…1) at each cloud level: the wind aloft may turn from the 10 m wind. */
  aloftAcross: Record<CloudLevel, number>
}

export interface Plane {
  points: Pt[]
  /** Height (m) at each point, when sampled. */
  elevations?: number[]
  /** Distance (km) of the land at each point. */
  distanceKm: number[]
  /**
   * The distances smoothed along the crest (a running median, then a mean, over ~±12 px): what the plane's haze follows,
   * so where a nearer hill takes over from a farther one inside one plane the tone turns over a stretch, not at a seam.
   */
  hazeKm?: number[]
}

export interface TerrainPlanes {
  near: Plane
  far: Plane
  back?: Plane
  floorY: number
  seaY: number
  /** Eye level (panorama only). */
  horizonY?: number
  /** The hand-drawn stand-in (no panorama yet). */
  drawn: boolean
  sightAt?: SceneTerrain['sightAt']
  seenAt?: SceneTerrain['seenAt']
  groundAt?: SceneTerrain['groundAt']
  snowEdge?: SceneTerrain['snowEdge']
  /** The ground that shows on each plane's face, from the terrain data (`face.ts`); empty for the drawn stand-in. */
  faces: Record<'near' | 'far', PlaneFace>
  /** The gullies, terraces and scrub on each plane, placed from the faces and seeded by the place (`land.ts`). */
  land: Record<'near' | 'far', LandForm>
}

export interface WaterState {
  spans: WaterSpan[]
  glints: Glint[]
  /** The light over the water (sun, or moon by night) and whether it stands above the land in its direction. */
  light: WaterLight | null
  lit: boolean
  byMoon: boolean
  /** The sea from the coast to the frame edge for a coastal city seen from outside (stage C5). */
  coastalSea: null
}

export interface Dot { x: number; y: number }

/** A place drawn as its portrait round the dot (a village, a small town). */
export interface PlacePortrait {
  kind: 'portrait'
  dot: Dot
  /** Its built-up area out to its farthest corner, plus the fields (`portrait.ts`). */
  reachKm: number
  style: SettlementStyle
  size: SettlementSize
  /** Only from roof evidence (5+ mapped roof shapes); else mixed (owner, 2026-11-19). */
  roofs: 'tile' | 'flat' | 'mixed'
  seed: number
}

/** A city seen from outside (variant B, `data/city/outsideView.ts`): mass of built squares and spires. */
export interface OutsideView {
  kind: 'outside'
  dot: Dot
  reachKm: number
  frame: OutsideFrame
  skyline: OutsideSkyline
  seed: number
}

/**
 * The text the scene keeps on the land, where the place's layout puts it (scene px at the layout width): the place's
 * height (under the sea line below sea level) and the notes (the "פני הים" datum, the water's names). The HTML overlay
 * shows them; the drawing keeps clear of them.
 */
export interface WorldLabels {
  /** `x` is the label's centre, `y` its top. */
  height: { text: string; below: boolean; x: number; y: number }
  notes: SceneNote[]
}

export interface Night {
  /** Share of windows lit (`atmo/life/mapMarks.ts`). */
  litShare: number
  /** 0–1: the clear share of the sky, which the stars show through (0 under full cover). */
  starsThrough: number
  /** 0 by day … 1 in full night (the sun from −4° to −12°). */
  dark: number
  /** Red lights on masts and towers. */
  aviation: boolean
}

export interface WorldKeys {
  bodies: string
  light: string
  air: string
  clouds: string
  rain: string
  wind: string
  terrain: string
  water: string
  place: string
  marks: string
  night: string
  ground: string
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
  wind: Wind
  terrain: TerrainPlanes
  water: WaterState
  place3: PlacePortrait | OutsideView
  /** The marks after the portrait / outside rules (`hillScene` until stages C4–C5 rewrite it in `scene/model`). */
  marks: PlacedMark[]
  /** The height label and the notes on the land (the place part: independent of the hour). */
  labels: WorldLabels
  night: Night
  ground: { wet: number; snowLineM: number | null }
  sources: WorldSources
  keys: WorldKeys
}
