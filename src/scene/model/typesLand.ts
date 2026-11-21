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
/** A wash hanging from a line (a lit or shaded band below a crest): `depth[i]` px below `top[i]`, fading downward. */
export interface Wash { top: Pt[]; depth: number[]; rgb: RGB; alpha: number }
/** A fine stroke along a crest where it catches the light. */
export interface Rim { points: Pt[]; rgb: RGB; alpha: number }
/** Where the small things of the ground catch the light: toward (dx, dy), in this colour and strength. */
export interface Lift { dx: number; dy: number; rgb: RGB; alpha: number }
/** Snow over a plane above its snow line (`edge`, increasing screen-x order), lit by the scene's light. */
export interface SnowCap { edge: Pt[]; rgb: RGB; alpha: number }

/**
 * The light part of a light-dependent layer (the scrub split, §1d): the layer's own `key` covers its form only (fills,
 * texture: no light), this `key` covers what the light changes. The compositor repaints the light canvas alone when only
 * this key changes, and lays it over the form with `blend`; the light painter keeps inside the form's shape.
 */
export interface LightPart {
  key: string
  /** How the light canvas meets the form under it (`source-over` covers it; the planes lay theirs on with `source-over`). */
  blend: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** Optional layer tone after light and haze (omitted on planes where `veil` drives painting directly). */
  tint?: RGB
  faces: Face[]
}

/**
 * Compact, structured-cloneable quantised land albedo palette for one terrain plane (Stage 3: living land).
 * Light-free: baked into the plane's FORM canvas and cached by `world.keys.land` (never repainted on hour scrub).
 */
export interface PlanePalette {
  /** Quantised light-free surface tones (1..6 sRGB colours). */
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
 * Built on the FORM layer (keyed by `world.keys.land`, independent of hour/light/wind).
 * Typed arrays keep Worker transfer tiny while storing per-tree `(height, phase)` ready for Stage 5 wind sway.
 */
export interface PlaneVegetation {
  /** Coordinate-derived seed for deterministic painterly detail (never from place names). */
  seed: number
  /** Tree & orchard crowns, back-to-front by y (stride 6: x, y, radius, height, phase, shade). */
  trees: Float32Array
  /** Per-tree metadata (stride 3: kind 0=pine 1=olive 2=citrus 3=palm; toneIdx into `tones`; alphaByte 0..255). */
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
  /** Small shared light-free illustrated vegetation palette (≤ 17 muted sRGB tones). */
  tones: RGB[]
}

/**
 * A plane's light part (C2 + Living Land Stage 3). The form under it carries the light-free quantised land albedo,
 * seeded patches, mottle, gullies, terraces and vegetation; this canvas lays the scene's mood, wet-ground & aerial haze
 * veil (`veil`, `source-over`), snow, shaded and lit bands, floor shadow, crest rim and ground/canopy lift over it.
 */
export interface PlaneLight extends Omit<LightPart, 'tint'> {
  /** Source-over mood, wet-ground attenuation & aerial haze veil across the plane (x px -> [colour, alpha]). */
  veil: [number, RGB, number][]
  /** Shade on the faces turned from the light, then light on the faces turned to it. */
  shade: Wash[]
  lit: Wash[]
  /** Faces after the washes: the ridge's shadow on the floor. */
  faces: Face[]
  rims: Rim[]
  snow: SnowCap | null
  lift: Lift | null
}

/** The place's own ground polygon over the ridge line in the outside view (C5b + Stage 3). */
export interface OutsideLandDesc {
  top: Pt[]
  base: Pt[]
  tone: RGB
  stops: [number, RGB][]
  source: string
  rim: RGB
  /** Snow lying on it (C9): its colour and cover, over the runs of top points (first, last index) at or over the line. */
  snow: { rgb: RGB; alpha: number; runs: [number, number][] } | null
}
