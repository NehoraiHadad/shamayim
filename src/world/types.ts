import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import type { BoundsFile } from '../data/city/bounds'
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import type { OutsideFrame, OutsideSkyline, OutsideTower } from '../data/city/outsideView'
import type { FarData } from '../data/city/farData'
import type { PlainPatch } from '../data/city/plainData'
import type { CityResult } from '../data/city/types'
import type { SettlementSize, SettlementStyle } from '../data/landmarks/settlement'
import type { Landmark, PlacedMark } from '../data/landmarks/types'
import type { Relief } from '../data/terrain/angleScale'
import type { SceneNote } from '../data/terrain/sceneNotes'
import type { LandStatus, SceneTerrain } from '../data/terrain/terrain'
import type { Glint, WaterLight } from '../data/water/glint'
import type { WaterSpan } from '../data/water/waterInView'
import type { Camera } from '../domain/camera'
import type { WeightedSighting } from '../domain/cloudSightings'
import type { Forecast, LocalTime } from '../domain/types'
import type { SkyLight } from '../theme/skyLight'
import type { PlaneFace } from './face'
import type { LandForm } from './land'
import type { GlyphKind } from './glyphSpecs'
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
  /** The far raster (`far.json`: built share and storeys per ~0.5 km cell, towers of 80 m+); the far towns need it. */
  far?: FarData | null
  /** Single clouds the satellite sees near the place now (`sightingsNow`). */
  seenClouds?: readonly WeightedSighting[] | null
  /** The figure's width in px the marks are laid out for; 375 (the reference) when absent. */
  width?: number
  /** Dev overrides of the shown air (`?wx=`), applied as App applies them. */
  forced?: Partial<AirInput> | null
  /** The large water round Israel (`water.json`): a coastal place's own sea seen from outside (C5). */
  waterMask?: WaterMask | null
  /** The places' own boundaries (`bounds.json`): the outside view's frame is cut at them (C5). */
  bounds?: BoundsFile | null
  /** The land cover round the place (WorldCover, ~6 km): its built cells and trees, the fabric every place is built from (C5). */
  cover?: LandCover | null
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
  /** How far (scene px) it stands over the land in its direction, negative behind it (the sun's, `sunBody`). */
  clearance?: number
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

/** Snow falling (C7): from the precipitating layer's banks, at their true azimuths, carried by the one wind. */
export interface Snowfall {
  /** 0-1, as the snow line's `amount`. */
  amount: number
  cells: RainCell[]
  /** Rad from vertical, signed like `wind.across`. */
  slant: number
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
  /**
   * Whether the place's land is known (C8): `loading` or `offline`, the world stands on `unknownLand` (no ridge, a guessed
   * eye level) and the scene draws a mist in the land's place; `ready`, the panorama's planes.
   */
  status: LandStatus
  sightAt?: SceneTerrain['sightAt']
  seenAt?: SceneTerrain['seenAt']
  groundAt?: SceneTerrain['groundAt']
  snowEdge?: SceneTerrain['snowEdge']
  /** The ground that shows on each plane's face, from the terrain data (`face.ts`); empty for the drawn stand-in. */
  faces: Record<'near' | 'far', PlaneFace>
  /** The gullies, terraces and scrub on each plane, placed from the faces and seeded by the place (`land.ts`). */
  land: Record<'near' | 'far', LandForm>
}

/** A place a ripple can take on the water (`ripplesOf`): its spot, place down the surface and seeded draws. */
export interface Ripple { x: number; y: number; v: number; length: number; side: number; strength: number; gate: number }

export interface WaterState {
  spans: WaterSpan[]
  glints: Glint[]
  /** Per span, where ripples can show (independent of the hour; the wind picks how many). */
  ripples: Ripple[][]
  /** The light over the water (sun, or moon by night) and whether it stands above the land in its direction. */
  light: WaterLight | null
  lit: boolean
  byMoon: boolean
  /** The sea from the coast to the frame edge for a coastal city seen from outside (stage C5, `outside.ts`). */
  coastalSea: CoastalSea | null
}

/**
 * A coastal place's own sea in the outside view (C5 item 1, C5b): the water from its shore out to the true sea horizon
 * (`horizon`, a level line: the panorama's sea horizon), down to the sheet, on the sea's side of the place (layout px).
 * `coast` runs from the horizon (far) to the sheet (near), along the shore where the place's land meets the water;
 * `km` the water's distance at its rows (y → km, far to near): the horizon's, the place's far and near rows, the sheet's.
 */
export interface CoastalSea { points: Pt[]; coast: Pt[]; side: 'left' | 'right'; top: number; bottom: number; horizon: number
  km: [number, number][] }

/** A seen stretch of a built cell on the plain (`plainPatches`), with its cell's mean storeys (0 when unknown). */
export interface FarPatch extends PlainPatch { level: number }

/** A tower of the far raster in view: on the plain, or on the far ridge's crest (scene px; `km` from the eye). */
export interface FarTowerSite { x: number; top: number; base: number; km: number; heightM: number; onRidge: boolean }

/**
 * The towns beyond the near ridge (`farCities.ts`): the seen stretches of built cells on the plain, with their distance,
 * built share and storeys, and the far raster's towers in view. Independent of the hour.
 */
export interface FarCities {
  patches: FarPatch[]
  towers: FarTowerSite[]
  /** A place seen from outside keeps its own city to the outside view: the far towns start here (km), else null. */
  fromKm: number | null
  /** What is drawn of them (`townShapes`): the towns' mass by strength step, their blocks and towers, their lights. */
  shapes: {
    mass: { x: number; y: number; w: number; h: number; km: number; step: number }[]
    blocks: { x: number; base: number; w: number; h: number; km: number }[]
    lights: { x: number; y: number; r: number; alpha: number; km: number }[]
  }
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
  /** The houses and trees round the dot (`portrait.ts`), at the layout width. */
  plan: PortraitPlan
}

/** A house of the portrait: `x` its left edge, standing on `base`; `tint` 0–1 its plaster, `row` its contour row. */
export interface PortraitHouse {
  x: number; base: number; w: number; h: number; storeys: number; row: number
  roof: 'tile' | 'flat'
  /** A solar water heater on the flat roof. */
  heater: boolean
  tint: number
  seed: number
}
/** A tree of the portrait: `x` its centre. */
export interface PortraitTree { kind: 'tree' | 'cypress' | 'palm'; x: number; base: number; w: number; h: number; row: number; seed: number }
export interface PortraitPlan {
  /** Half the village (px): the falloff's reach. */
  halfPx: number
  houses: PortraitHouse[]
  trees: PortraitTree[]
}

/**
 * A mark as the world places it (stage C4, `marks.ts`): the data's placed mark, its glyph, and where it stands in scene
 * px at the layout width.
 */
export interface WorldMark extends PlacedMark {
  glyphKind: GlyphKind
  /** Centre x and base y (px). */
  x: number
  base: number
  /** Drawn height in glyph px, and px per glyph px (far marks 0.6, plain ones by distance). */
  h: number
  scale: number
  /** Box width (px, after scale). */
  w: number
  /** A field: px under the crest its first row lies (its rows follow the ground). */
  depth?: number
  /** How far (km) it stands: the haze it takes. */
  km: number
  plane: 'near' | 'far' | 'plain'
  /** A landmark, named (an unnamed mark is never one). */
  named: boolean
}

/** A tree of the place seen from outside (layout px): `x` its centre on `base`, `km` its haze. */
export interface OutsideTreeSite { x: number; base: number; w: number; h: number; near: number; kind: 'tree' | 'cypress' | 'palm'
  seed: number; km: number }

/**
 * A tower beyond the place (C5 item 3): in the outside view's own perspective at its true spot (C5b: scaled and hazed by
 * its true distance from that eye, never larger than the panorama shows it), with the outside view's level of detail.
 */
export interface BeyondTower extends OutsideTower { km: number }

/** A built square of a town beyond the place (C9), in the outside view: its middle x, base, width and height (px). */
export interface BeyondBlock { x: number; baseY: number; w: number; h: number; km: number; heightM: number; seed: number }

/** A city seen from outside (variant B, `data/city/outsideView.ts`, `outside.ts`): mass of built squares and spires. */
export interface OutsideView {
  kind: 'outside'
  dot: Dot
  reachKm: number
  frame: OutsideFrame
  skyline: OutsideSkyline
  seed: number
  /** Where the frame was cut: the place's mapped boundary, its cell among the place points, or (no data) its cluster. */
  bounds: { source: 'boundary' | 'cell' | 'cluster'; name?: string }
  /** The ground (m) the ridge line stands for (the place's top); null without the local ground. */
  topM: number | null
  /** The towers beyond the place within 6 km, at their true bearing. */
  beyond: BeyondTower[]
  /** C9: the towns beyond the place within 6 km (its neighbours' built squares), as the towers beyond: far first. */
  beyondTowns?: BeyondBlock[]
  /** The near ridge's distance at the dot (km): the haze of the place's nearest row. */
  baseKm: number
  /** The place's trees (from the land cover near its built cells). */
  trees: OutsideTreeSite[]
  /** Where its fabric came from: the land cover's built cells (heights from the city raster), or the raster's squares. */
  fabric: 'cover' | 'raster'
  /** Its houses' roofs: by roof evidence (5+ mapped roofs), else mixed. */
  roofs: 'tile' | 'flat' | 'mixed'
  /**
   * The place's own ground where it rises over the ridge line (C5b): its silhouette from the local ground (`top`, west to
   * east on screen, layout px) down to the ridge line (`base`); empty where the place lies under the line.
   */
  land: { top: Pt[]; base: Pt[]; km: number; /** The ground's height (m) at each top point (its snow). */ heightM?: number[] } | null
}

/**
 * The text the scene keeps on the land, where the place's layout puts it (scene px at the layout width): the place's
 * height (under the sea line below sea level) and the notes (the "פני הים" datum, the water's names). The HTML overlay
 * shows them; the drawing keeps clear of them.
 */
export interface WorldLabels {
  /** `x` is the label's centre, `y` its top; `backed` (C9): beside the dot on a small backing, over the place's mass. */
  height: { text: string; below: boolean; x: number; y: number; backed?: boolean }
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
  farCities: string
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
  /** Snow falling now from the clouds (C7), or null. */
  snowfall: Snowfall | null
  wind: Wind
  terrain: TerrainPlanes
  water: WaterState
  farCities: FarCities
  place3: PlacePortrait | OutsideView
  /** The marks after the portrait / outside rules (`marks.ts`), seated on the land they stand on. */
  marks: WorldMark[]
  /** The height label and the notes on the land (the place part: independent of the hour). */
  labels: WorldLabels
  night: Night
  ground: { wet: number; snowLineM: number | null }
  sources: WorldSources
  keys: WorldKeys
}
