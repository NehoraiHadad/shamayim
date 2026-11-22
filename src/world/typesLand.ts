import type { OutsideFrame, OutsideSkyline, OutsideTower } from '../data/city/outsideView'
import type { PlainPatch } from '../data/city/plainData'
import type { SceneNote } from '../data/terrain/sceneNotes'
import type { LandStatus, SceneTerrain } from '../data/terrain/terrain'
import type { Glint, WaterLight } from '../data/water/glint'
import type { WaterSpan } from '../data/water/waterInView'
import type { Datum } from './datum'
import type { PlaneFace } from './face'
import type { LandForm } from './land'
import type { Pt } from './typesAtmo'

/** Terrain plane, water, settlement, landmark and label types for `WorldState`. */
export interface Plane {
  points: Pt[]
  /** Height (m) at each point, when sampled. */
  elevations?: number[]
  /** Distance (km) of the land at each point. */
  distanceKm: number[]
  /** Distances smoothed along the crest (running median then mean, ~±12 px): what the plane's haze follows. */
  hazeKm?: number[]
}

export interface TerrainPlanes {
  near: Plane; far: Plane; back?: Plane
  floorY: number; seaY: number
  /** Eye level (the panorama's, or the unknown land's guess). */
  horizonY: number
  /** Whether the place's land is known (C8): `loading`/`offline` stand on `unknownLand`; `ready` is the panorama. */
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
  spans: WaterSpan[]; glints: Glint[]
  /** Per span, where ripples can show (independent of the hour; the wind picks how many). */
  ripples: Ripple[][]
  /** The light over the water (sun, or moon by night) and whether it stands above the land in its direction. */
  light: WaterLight | null
  lit: boolean; byMoon: boolean
  /** The sea from the coast to the frame edge for a coastal city seen from outside (stage C5, `outside.ts`). */
  coastalSea: CoastalSea | null
}

/** Coastal place's own sea in the outside view (C5 item 1, C5b). */
export interface CoastalSea {
  points: Pt[]; coast: Pt[]; side: 'left' | 'right'; top: number; bottom: number; horizon: number; km: [number, number][]
}

/** A seen stretch of a built cell on the plain (`plainPatches`), with its cell's mean storeys (0 when unknown). */
export interface FarPatch extends PlainPatch { level: number }

/** A tower of the far raster in view: on the plain, or on the far ridge's crest (scene px; `km` from the eye). */
export interface FarTowerSite { x: number; top: number; base: number; km: number; heightM: number; onRidge: boolean }

/** The towns beyond the near ridge (`farCities.ts`), independent of the hour. */
export interface FarCities {
  patches: FarPatch[]; towers: FarTowerSite[]
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

/** The place while its land is not known (C8, `unknownPlace`): dot waits at guessed eye level. */
export interface PlaceUnknown { kind: 'unknown'; dot: Dot; reachKm: number; seed: number }

/** A tree of the place seen from outside (layout px): `x` its centre on `base`, `km` its haze. */
export interface OutsideTreeSite {
  x: number; base: number; w: number; h: number; near: number; kind: 'tree' | 'cypress' | 'palm'; seed: number; km: number
}

/** A tower beyond the place (C5 item 3), in the outside view's perspective at its true spot. */
export interface BeyondTower extends OutsideTower { km: number }

/** A built square of a town beyond the place (C9), in the outside view: its raster square id and box (px). */
export interface BeyondBlock { id: string; x: number; baseY: number; w: number; h: number; km: number; heightM: number; seed: number }

/** A city seen from outside (variant B, `data/city/outsideView.ts`, `outside.ts`): mass of built squares and spires. */
export interface OutsideView {
  kind: 'outside'; dot: Dot; reachKm: number; frame: OutsideFrame; skyline: OutsideSkyline; seed: number
  bounds: { source: 'boundary' | 'cell' | 'cluster'; name?: string }
  topM: number | null; beyond: BeyondTower[]; beyondTowns?: BeyondBlock[]
  baseKm: number; trees: OutsideTreeSite[]; fabric: 'cover' | 'raster'; roofs: 'tile' | 'flat' | 'mixed'
  /**
   * The place's own ground polygon over the ridge line: `localKm` holds `[dxKm, dyKm]` (east/north km from the place)
   * of each crest column for local living-land albedo lookup; `km` is the portrait-scale aerial-haze distance
   * approximation (near-ridge distance at `frame.centerX`).
   */
  land: { top: Pt[]; base: Pt[]; km: number; heightM?: number[]; localKm?: Pt[] } | null
  vscale?: { s: number; h0: number } | null
}

/** The text the scene keeps on the land: place height label, notes and sea-level datum. */
export interface WorldLabels {
  height: { text: string; below: boolean; x: number; y: number; backed?: boolean }
  notes: SceneNote[]
  datum?: Datum | null
}
