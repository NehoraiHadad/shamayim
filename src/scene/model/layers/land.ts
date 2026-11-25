import type { Pt, RGB } from '../../../world/types'
import type { CanopyTones } from '../canopyTones'
import type { Lamp } from './lamp'
import type { PlantWind } from '../landWind'
import type { ReceiverShadow } from '../planeCloudShadow'
import type { Box, LayerBase, LightPart, Plain } from './base'

/**
 * Land, plane and outside-ground scene-model descriptors (Stage C2 + Living Land Stage 3).
 * Pure structured-cloneable data shared across model builders and Worker painters.
 */

export type Path = Pt[]
export interface Dot { x: number; y: number; r: number; rgb: RGB }
/** The ground's low-frequency mottle and fine grain on a plane's form: strength 0–1 and its seed. */
export interface Grain { amount: number; seed: number }
/** A gully: a tapered cut down a slope, `w` px wide at its top, darkening the ground by `alpha`. */
export interface Gully { points: Pt[]; w: number; alpha: number }

/**
 * Compact, structured-cloneable quantised land albedo palette for one terrain plane (Stage 3: living land).
 * Light-free: sampled into stationary material texels and cached across light changes.
 */
export interface PlanePalette {
  /** Quantised light-free surface tones (sRGB colours). */
  palette: RGB[]
  /**
   * Columns across the plane in increasing screen-x order (left -> right; compass direction follows the camera,
   * e.g. east -> west in the south-facing unmirrored view).
   */
  cols: number
  /** Distance bands down the plane face (crest -> local visible foot). */
  rows: number
  /** Flat `rows * cols` array of indices into `palette` (row-major, increasing screen-x within each row). */
  cells: number[]
  /** Dominant living-land albedo provenance for this plane (e.g. `s2:2026-11-15`, `climatology`). */
  source: string
}

/**
 * Compact, structured-cloneable vegetation descriptor for one terrain plane (Stage 4: living land).
 * Built with the plane form (keyed by `world.keys.land`, independent of hour/light/wind).
 * Typed arrays keep Worker transfer small and carry each tree's height and seeded gust phase offset.
 */
export interface PlaneVegetation {
  /** Coordinate-derived seed for deterministic painterly detail (never from place names). */
  seed: number
  /** Tree & orchard crowns, back-to-front by y (stride 6: x, y, radius, height, phase, shade). */
  trees: Float32Array
  /** Per-tree metadata (stride 3: kind 0=pine 1=olive 2=citrus 3=palm 4=orchard; toneIdx into `tones`; alphaByte 0..255). */
  treeMeta: Uint8Array
  /** Ground-plane cropland field quads (stride 9: x0,y0, x1,y1, x2,y2, x3,y3, alpha). */
  fields: Float32Array
  /** Per-field metadata (stride 2: state 0=growing 1=ploughed 2=straw; toneIdx into `tones`). */
  fieldMeta: Uint8Array
  /** Converging orchard/plantation row or alley lines (stride 6: x0, y0, x1, y1, width, alpha). */
  rows: Float32Array
  /** Per-row tone index into `tones` (stride 1). */
  rowMeta: Uint8Array
  /** Scrub & grass tufts (stride 4: x, y, radius, alpha). */
  tufts: Float32Array
  /** Per-tuft metadata (stride 2: kind 0=shrub 1=grass; toneIdx into `tones`). */
  tuftMeta: Uint8Array
  /** Soft geological strata bands on bare/desert slopes (stride 6: x0, y0, x1, y1, thickness, alpha). */
  strata: Float32Array
  /** Per-strata tone index into `tones` (stride 1). */
  strataMeta: Uint8Array
  /** Small shared light-free illustrated vegetation palette (≤ 18 muted sRGB tones). */
  tones: RGB[]
}

/** The upright vegetation is the only part needed by the canopy strips. */
export type CanopyVegetation = Pick<PlaneVegetation, 'seed' | 'tones' | 'trees' | 'treeMeta' | 'tufts' | 'tuftMeta'>

/** Compact linear irradiance, receiver visibility, snow and face-distance haze for the Worker. */
export interface PlaneLitField {
  cols: number
  rows: number
  /** Stride-4 `[sVis, mVis, vSky, hazeShare]` in `0..255` per `(r * cols + c)` node. */
  grid: Uint8Array
  /** Hoisted linear irradiance vectors `(E_k / π · C_k · wetFactor)` for sun, moon and diffuse sky. */
  eSun: readonly [number, number, number]
  /** Neutral solar light scattered through the cloud, in the shaded endpoint only. */
  cloudDiffuse?: readonly [number, number, number]
  eMoon: readonly [number, number, number]
  eSky: readonly [number, number, number]
  /** Linear RGB of `hazeOf(world)` and linear display exposure in the sky reference frame. */
  hazeLin: readonly [number, number, number]
  yHorizon: number
  /** Small crest-edge occlusion accent on overlapping snowy planes. */
  snowSeam?: number
  /** Optional ragged snow-line edge (`[x, y]` in box px) and snow cover (`0..1`), blended into reflectance before lighting. */
  snow?: { edge: Pt[]; cover: number } | null
}

/** A terrain receiver's shared lighting field. */
export interface PlaneLight extends Omit<LightPart, 'tint'> {
  litField: PlaneLitField
}

/** The place's own ground polygon over the ridge line in the outside view (C5b + Stage 3). */
export interface OutsideLandDesc {
  top: Pt[]
  base: Pt[]
  tone: RGB
  stops: [number, RGB][]
  source: string
  rim: RGB
}

/**
 * The place standing on the near plane, for its painters alone (paint quality, never placement): its own bodies as
 * `x` (centre), `w`, `foot`, `top` (px, four numbers each, back to front), its trees as `x`, `base`, `w`, `h`, and the top
 * of its own ground over the ridge line (`OutsideLandDesc.top`); `key` names all of it.
 */
export interface PlaneTown { bodies: number[]; trees: number[]; land: Pt[] | null; key: string }

export type LandLayers =
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB; surfaceTone: PlanePalette;
      gullies: Gully[]; terraces: Path[]; vegetation: PlaneVegetation; grain: Grain; light: PlaneLight; canopyId?: string; cloudShadow?: ReceiverShadow; lamp?: Lamp
      /** The near plane's town (`planeTown`). */
      town?: PlaneTown
      /** What a style's own light adds for its painter alone (`StyleLight.meet`). */
      own?: Plain }
  | LayerBase & { kind: 'canopy'; outline: Pt[]; vegetation: CanopyVegetation; wind: PlantWind; clear: readonly Box[]; receiver?: { form: string }; cloudShadow?: ReceiverShadow;
      tones?: CanopyTones; shadedTones?: CanopyTones & { key: string } }
