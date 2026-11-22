import type { Pt, RGB } from '../../world/types'

/**
 * Land, plane and outside-ground scene-model descriptors (Stage C2 + Living Land Stage 3).
 * Pure structured-cloneable data shared across model builders and Worker painters.
 */

/** A filled shape; `soft` > 0 softens its edge over about that many px (stacked offset copies, no filter). */
export interface Face { points: Pt[]; rgb: RGB; alpha: number; soft?: number }
export type Path = Pt[]
export interface Dot { x: number; y: number; r: number; rgb: RGB }
/** The ground's low-frequency mottle and fine grain on a plane's form: strength 0–1 and its seed. */
export interface Grain { amount: number; seed: number }
/** A gully: a tapered cut down a slope, `w` px wide at its top, darkening the ground by `alpha`. */
export interface Gully { points: Pt[]; w: number; alpha: number }

/**
 * The light part of a light-dependent layer (the scrub split, §1d): the layer's own `key` covers its form only (fills,
 * texture: no light), this `key` covers what the light changes. The compositor repaints the light canvas alone when only
 * this key changes, and lays it over the form with `blend`; the light painter keeps inside the form's shape.
 */
export interface LightPart {
  key: string
  /** How the light canvas meets the form under it (`source-over` covers it; the planes lay theirs on with `source-over`). */
  blend: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** Optional layer tone after light and haze (omitted on terrain planes). */
  tint?: RGB
  faces: Face[]
}

/**
 * Compact, structured-cloneable quantised land albedo palette for one terrain plane (Stage 3: living land).
 * Light-free: baked into the plane's FORM canvas and cached by `world.keys.land` (never repainted on hour scrub).
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
  litField?: PlaneLitField
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
