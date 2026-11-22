import type { AirInput } from '../atmo/airTypes'
import type { Place } from '../config/place'
import type { BoundsFile } from '../data/city/bounds'
import type { LandCover } from '../data/land/landData'
import type { WaterMask } from '../data/water/waterMask'
import type { OutsideFrame, OutsideSkyline, OutsideTower } from '../data/city/outsideView'
import type { FarData } from '../data/city/farData'
import type { PlainPatch } from '../data/city/plainData'
import type { CityResult } from '../data/city/types'
import type { Landmark } from '../data/landmarks/types'
import type { Relief } from '../data/terrain/angleScale'
import type { SceneNote } from '../data/terrain/sceneNotes'
import type { Datum } from './datum'
import type { LandStatus, SceneTerrain } from '../data/terrain/terrain'
import type { Glint, WaterLight } from '../data/water/glint'
import type { WaterSpan } from '../data/water/waterInView'
import type { Camera } from '../domain/camera'
import type { WeightedSighting } from '../domain/cloudSightings'
import type { Forecast, LocalTime } from '../domain/types'
import type { SkyLight } from '../theme/skyLight'
import type { PlaneFace } from './face'
import type { LandForm } from './land'
import type { SeatedWorldMark, WorldMark } from './markGeometry'
import type { Mist } from './mist'
import type { SnowFall } from './snowLine'

/**
 * The world state: one description of the place at the shown minute, built once from the data (`buildWorld`), that
 * every element of the canvas scene answers to (docs/design/CANVAS-SCENE-PLAN.md §1a). Pure data: no DOM, no clock.
 * Positions are scene px at the reference width (`camera.width`, 375) unless a field says otherwise; colours are sRGB
 * 0–1; angles are degrees (azimuth clockwise from north).
 */

import type { SkyLife } from './life'
import type { NightSky } from './nightSky'
import type { Optics } from './optics'
import type { PlaceEnv } from './placeEnv'

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
  /** Whole real minutes elapsed since anchoring the selected minute, for life positions and events. */
  lifeOffsetMinutes?: number
  terrain: SceneTerrain
  /**
   * Unused since 2026-11-20: the sun and moon are judged on the land as drawn (`drawnSkyline.ts`), whatever panorama it
   * came from. Kept for the turning view (`camera-fable.md`), which will judge on its own drawn land.
   */
  sunTerrain?: SceneTerrain
  /** Landmarks, the place's own homes and the satellite's groves (App's `marks`). */
  landmarks: readonly Landmark[]
  /** Extra settlement-kind marks within skyline reach carried solely for beyond-town seating (never the own portrait). */
  seatCandidates?: readonly Landmark[]
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
  /** The land cover round the place (WorldCover, ~6 km): its built cells and trees, the fabric every place is built from (C5). */
  cover?: LandCover | null
}

/** Where a field came from when the forecast did not give it: fallbacks are marked, never silent. */
export interface WorldSources {
  /** Cloud layers: the forecast's own, split from `thickCloud` and the cover, or from the cover alone. */
  cloudLayers: 'forecast' | 'thickCloud' | 'cover' | 'forced'
  /** The low layer was raised so the forecast's rain has a cloud to fall from. */
  rainCloudRaised: boolean
  windDirection: 'hour' | 'current' | 'forced'
  /** Wind at cloud heights: the forecast's (850/700/300 hPa) or ×1.4 / ×2 / ×3 the 10 m wind. */
  windAloft: 'forecast' | 'derived'
  visibility: 'hour' | 'current' | 'humidity' | 'default' | 'forced'
  /** The air at cruise level (contrails, C10): the forecast's 250 hPa fields or a climatological guess. */
  cruise: 'forecast' | 'climate'
  /** The towns' sky glow (C10): from the far raster, the land cover round the place, or its population. */
  glow: 'far' | 'cover' | 'population'
}

/** Angle → y, shared by land and sky: the vertical scale (`RELIEF`) above eye level. */
export interface WorldRelief {
  scale: Relief
  /** y of eye level (0°): the panorama's, or the guess while the land is unknown (`UNKNOWN_EYE_Y`). */
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
  /**
   * The share of its true disc over the drawn land (0–1; `livingLight.ts` `discShare`): partial occlusion softened by the
   * edge's shimmer, so the light fades as the disc sinks behind the land. Every consumer of its direct light takes this.
   */
  visible?: number
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
  /** Signed lateral direction (negative left, positive right), attenuated by the direct-light shading ramp. */
  across: number
  /** The light's direction in drawn space, [across, up], as the ridge lighting takes it; null for 'sky'. */
  ray: [number, number] | null
  /** Direct light after air mass and aerosol (`sceneLight.ts`); the moon's is cool and dim. */
  colour: RGB
  /** 0–1: beam reaching the observer along the disc ray. */
  eye: number
  /** Mean cloud transmission available to illuminate the scene. */
  clear: number
  /** Sun and moon illuminance after mean cloud transmission. */
  meanBeam: { sun: number; moon: number }
  /** 0–1: land's base light after haze and closed decks. */
  direct: number
  /** The direct share of each source (their sum is `direct`; one of them is 0 at any minute). */
  shares: { sun: number; moon: number }
  /**
   * The light's direction in the view's frame (`livingLight.ts` `viewDir`, toward the source that gives the direct share):
   * every surface takes it by its own normal (Lambert), so lit and shade sides turn as the source moves, never flip.
   */
  dir: { across: number; ahead: number; up: number }
  /** 0 clear … 1 overcast: how much of the light is the sky's (soft, nearly directionless shading under a deck). */
  diffuse: number
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
  /** The fades of the far and near planes (`world/airParts.ts` `haze`), for tones carried over from the SVG scene. */
  farFade: number
  nearFade: number
  horizonBand: { rgb: RGB; alpha: number }
  /** Shallow valley/ground mist and fog (radiation vs persistent, 0–1; `mist.ts`). */
  mist: Mist
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
  /** How much of it has formed (0–1): the newest bank of a growing cover gathers as the cover grows (`banksOf`). */
  share?: number
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

export interface FieldRainCell extends RainCell {
  x: number
  y: number
  radiusKm: number
  share: number
  virga: number
  atEye: boolean
  baseKm: number
  cloudX: number
  cloudY: number
  seed: number
}

export interface Rain {
  rateMmH: number
  /** Shafts from the raining layer, at their true azimuths. */
  cells: FieldRainCell[]
  near: boolean
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
  /** Eye level (the panorama's, or the unknown land's guess). */
  horizonY: number
  /**
   * Whether the place's land is known (C8): `loading` or `offline`, the world stands on `unknownLand` (no ridge, a guessed
   * eye level) and the scene draws a mist in the land's place; `ready`, the panorama's planes.
   */
  status: LandStatus
  sightAt?: SceneTerrain['sightAt']
  /** Ground in metres relative to the eye. */
  groundAt?: SceneTerrain['groundAt']
  eyeM?: number
  snowEdge?: SceneTerrain['snowEdge']
  /** The ground that shows on each plane's face, from the terrain data (`face.ts`); empty for the unknown land. */
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

/**
 * The place while its land is not known (C8, `world.ts` `unknownPlace`): nothing is placed on a guessed ridge; the dot
 * waits at the guessed eye level.
 */
export interface PlaceUnknown {
  kind: 'unknown'
  dot: Dot
  reachKm: number
  seed: number
}

/** A tree of the place seen from outside (layout px): `x` its centre on `base`, `km` its haze. */
export interface OutsideTreeSite { x: number; base: number; w: number; h: number; near: number; kind: 'tree' | 'cypress' | 'palm'
  seed: number; km: number }

/**
 * A tower beyond the place (C5 item 3): in the outside view's own perspective at its true spot (C5b: scaled and hazed by
 * its true distance from that eye, never larger than the panorama shows it), with the outside view's level of detail.
 */
export interface BeyondTower extends OutsideTower { km: number }

/** A built square of a town beyond the place (C9), in the outside view: its raster square id, middle x, base, width and height (px). */
export interface BeyondBlock { id: string; x: number; baseY: number; w: number; h: number; km: number; heightM: number; seed: number }

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
  /** The place's top (m: its built squares' 95th percentile); null without the local ground. */
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
  /**
   * The place's one vertical scale (owner decision 14, "uniform per place"): `s` px a metre above and below the dot alike,
   * and the place point's ground `h0` (m); absent without the local ground (`world/outside.ts` `lieOf`).
   */
  vscale?: { s: number; h0: number } | null
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
  /** The "פני הים" datum's dashed line (px at 375), below sea level where the land reaches 0 m above the dot (`datum.ts`). */
  datum?: Datum | null
}

export interface Night {
  /** Share of windows lit (`night.ts` `litShareOf`). */
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
  life: string
  nightSky: string
  optics: string
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
  cloudField?: import('./cloudField').WorldCloudField
  rain: Rain | null
  snow: SnowFall | null
  /** Snow falling now from the clouds (C7), or null. */
  snowfall: Snowfall | null
  wind: Wind
  flightTerrain?: Pick<import('./flightTerrain').FlightTerrain, 'eyeM' | 'heightAt' | 'blockedKm' | 'panoramaHeightsM'>
  terrain: TerrainPlanes
  water: WaterState
  farCities: FarCities
  place3: PlaceUnknown | OutsideView
  /** The marks after the portrait / outside rules, with beyond seats budgeted for world layout and skyline. */
  marks: WorldMark[]
  /** All viable beyond seats, ranked for re-budgeting after the scene's screen-space cull. */
  seatPool: SeatedWorldMark[]
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
  sources: WorldSources
  keys: WorldKeys
}
