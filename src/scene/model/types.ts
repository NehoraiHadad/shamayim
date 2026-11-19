import type { GlyphKind, IconKind } from '../../world/glyphSpecs'
import type { CloudLevel, Pt, RGB } from '../../world/types'

/**
 * The scene model (docs/design/CANVAS-SCENE-PLAN.md §1b): what is drawn, where, in which colour and order, decided
 * from the world state alone. Pure data: no canvas, no DOM. Painters (`scene/paint/`) only add the hand.
 *
 * Coordinates: sky layers in sky px (the sky surface's box, `0…box.width × 0…box.skyHeight`); land layers in scene px
 * (the figure's box, `0…box.width × 0…box.landHeight`; the world's 375 px reference width scaled by `box.width`, heights
 * as they are). The sky's horizon is the land's eye level offset by `box.landTop`. Colours are sRGB 0–1.
 *
 * Every kind is declared; the sky (C1) and the planes (C2) are drawn. The shapes of the kinds drawn from C3 on are
 * placeholders for the stage that draws them and will be refined there.
 */

export type { Pt, RGB }

/** CSS px. `landTop` is where the land figure's top stands in the sky surface; `dpr` the device pixel ratio. */
export interface SceneBox { width: number; skyHeight: number; landTop: number; landHeight: number; dpr: number }

export interface Box { x: number; y: number; w: number; h: number }

export type LayerId = string
export type Surface = 'sky' | 'land'

/** An animated layer: the loop runs while one is present (C6–C8). */
export interface AnimSpec {
  /** `drift`: the cached sprite is translated (no repaint); `repaint`: the layer repaints its own small canvas. */
  mode: 'drift' | 'repaint'
  /** Scene px/s across, for `drift`. */
  speed?: number
}

/**
 * The light part of a light-dependent layer (the scrub split, §1d): the layer's own `key` covers its form only (fills,
 * texture: no light), this `key` covers what the light changes. The compositor repaints the light canvas alone when only
 * this key changes, and lays it over the form with `blend`; the light painter keeps inside the form's shape.
 */
export interface LightPart {
  key: string
  /** How the light canvas meets the form under it (`source-over` covers it; the planes lay theirs on with `overlay`). */
  blend: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** The layer's tone after light and haze (its mean, where it varies). */
  tint: RGB
  faces: Face[]
}

/**
 * A plane's light part (C2). The form under it is light-free and laid down in values round a neutral 0.5 grey (texture,
 * gullies, terraces, scrub darken it); this canvas holds the colours after light and haze and is laid over the form with
 * `overlay`, so a neutral form shows these colours exactly and the form's marks darken (or tint) them.
 */
export interface PlaneLight extends LightPart {
  /** The tone at the crest across the plane (x px → colour): aerial perspective by each direction's distance. */
  tones: [number, RGB][]
  /** Shade on the faces turned from the light, then light on the faces turned to it. */
  shade: Wash[]
  lit: Wash[]
  /** Faces after the washes: the ridge's shadow on the floor. */
  faces: Face[]
  rims: Rim[]
  snow: SnowCap | null
  lift: Lift | null
}

interface LayerBase {
  id: LayerId
  surface: Surface
  /** Draw order within its surface, low first. */
  z: number
  /** A hash of the layer's exact inputs (box and dpr included, never `phase`): repainted only when it changes. */
  key: string
  /** The layer's extent in its surface's px: its cached canvas is this size × the cache's pixel ratio. */
  bounds: Box
  animated?: AnimSpec
  /** Cached at `min(dpr, 2)`: soft layers (sky, clouds, mist) lose nothing to it. */
  soft?: boolean
  light?: LightPart
}

/* Shapes drawn from C2 on (placeholders, refined by the stage that draws them). */
export interface Glow { x: number; y: number; r: number; rgb: RGB; alpha: number }
export interface Band { y: number; h: number; rgb: RGB; alpha: number }
export interface Star { x: number; y: number; r: number; alpha: number }
export interface Disc { x: number; y: number; r: number; rgb: RGB; veil: number }
export interface MoonDisc extends Disc { phase: number; tilt: number }
export interface BankDesc { id: string; x: number; y: number; w: number; h: number; puffs: number; seed: number; lit: RGB; shade: RGB }
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
/** Snow over a plane above its snow line (`edge`, west to east), lit by the scene's light. */
export interface SnowCap { edge: Pt[]; rgb: RGB; alpha: number }
/**
 * One stretch of water in view (C3): its surface between the far edge and the near edge (land px), and its colours down
 * the surface: the sky it mirrors (by the Fresnel share at that depression, the higher sky nearer the eye) over the
 * water's own dark, after the air at that distance. `rim`: the fine light line where the far edge meets the land or the
 * sea's own horizon.
 */
export interface WaterBand {
  points: Pt[]
  far: Pt[]
  top: number
  bottom: number
  /** 0 at `top` … 1 at `bottom`. */
  stops: [number, RGB][]
  rim: { rgb: RGB; alpha: number }
}
/** A short horizontal stroke on the water (a ripple, a spark): `x` its left end, `w` its length. */
export interface Streak { x: number; y: number; w: number; alpha: number }
/** Wind ruffle: ripples catching the low sky (`light`) and the high sky (`dark`), their number and length by the wind. */
export interface Ruffle { light: RGB; dark: RGB; lit: Streak[]; shade: Streak[] }
/** The light's path on the water under the sun or moon, widening toward the eye with the waves' slope. */
export interface GlintPath { x: number; top: number; bottom: number; spread: number; rgb: RGB; alpha: number; sparks: Streak[] }
export interface Line { x1: number; x2: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number; rgb: RGB }
/** A block of a far town (or a far tower), standing on `base`, `km` away. */
export interface CityBlock { x: number; base: number; w: number; h: number; km: number }
/**
 * The far towns at one distance (C3): their mass (the town as the eye resolves it: cells of the built-share field, one
 * strength step each) and the blocks rising from it with a lit face toward the light, in tones after the air at `km`;
 * drawn far to near.
 */
export interface CityTier { km: number; lit: RGB; shade: RGB; mass: { alpha: number; boxes: Box[] }[]; blocks: CityBlock[] }
/** A lit window of a far town by night: a point with a faint halo, through the haze (Allard). */
export interface CityLight { x: number; y: number; r: number; alpha: number }
export interface Spire { x: number; base: number; w: number; h: number; tones: Tones }
export type { GlyphKind, IconKind }

/**
 * The colours a glyph, a house or a tree is painted in (stage C4), after the light and the air at its distance: the
 * scene's hand cut from the ridge colour and lifted toward the sky (walls), the light's colour on the faces turned to
 * it (`lit`), the sky-lit dark on the others (`shade`), and the materials (stone, glass, tile, foliage, panels, the Báb's
 * gold, lamps).
 */
export interface Tones {
  wall: RGB; lit: RGB; shade: RGB; deep: RGB; rim: RGB; refl: RGB
  roof: RGB; roofLit: RGB; stone: RGB; stoneLit: RGB; glass: RGB; glassLit: RGB; soot: RGB
  green: RGB; greenLit: RGB; panel: RGB; gold: RGB
  /** A lit window, a lamp. */
  win: RGB
  /** The foot mist: the air at the glyph's distance. */
  mist: RGB
}

/**
 * The light every glyph of a layer shares (one world light): how dark it is, how strong the direct light, the cast
 * shadow (across per px of height, away from the light; `alpha` 0 under overcast), the share of windows lit, the
 * aviation lights, the lean of trees and palms in the wind (rad, + leans right).
 */
export interface Shine {
  night: number
  direct: number
  cast: { dx: number; length: number; alpha: number }
  windows: number
  aviation: boolean
  lean: number
}

export interface GlyphDesc {
  kind: GlyphKind
  /** Centre x and base y (px); drawn height in glyph px; px per glyph px; box width (px). */
  x: number
  base: number
  h: number
  scale: number
  w: number
  seed: number
  /** The side the light comes from: a glyph is drawn with the light on the left and mirrored for the right. */
  litSide: 'left' | 'right' | null
  tones: Tones
  famous: boolean
  /** A field's ground under it: y (px, relative to `base`) every glyph px across its width, west to east. */
  ground?: number[]
}

/** A house of the portrait (px): `x` its left edge. */
export interface HouseDesc { x: number; base: number; w: number; h: number; storeys: number; roof: 'tile' | 'flat'; heater: boolean; tint: number; seed: number }
/** A tree of the portrait (px): `x` its centre. */
export interface TreeDesc { kind: 'tree' | 'cypress' | 'palm'; x: number; base: number; w: number; h: number; seed: number }
export interface RainField { count: number; slant: number; rgb: RGB; alpha: number; seed: number }
export interface Shaft { x: number; w: number; top: number; rgb: RGB; alpha: number }
export interface MistBand { y: number; h: number; rgb: RGB; alpha: number }

export type LayerDesc =
  | LayerBase & { kind: 'sky'; stops: [number, RGB][]; glow: Glow[]; band: Band | null }
  | LayerBase & { kind: 'stars'; stars: Star[]; through: number }
  | LayerBase & { kind: 'bodies'; sun: Disc | null; moon: MoonDisc | null }
  | LayerBase & { kind: 'clouds'; level: CloudLevel; banks: BankDesc[] }
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB; gullies: Gully[];
      terraces: Path[]; scrub: Dot[]; grain: Grain; light: PlaneLight }
  | LayerBase & { kind: 'water'; bands: WaterBand[]; ruffle: Ruffle; glints: GlintPath[];
      datum: (Line & { rgb: RGB; alpha: number }) | null }
  | LayerBase & { kind: 'farCities'; tiers: CityTier[]; litSide: 'left' | 'right' | null; lights: CityLight[]; lightRgb: RGB }
  | LayerBase & { kind: 'portrait'; houses: HouseDesc[]; trees: TreeDesc[]; glyphs: GlyphDesc[]; tones: Tones; shine: Shine
      litSide: 'left' | 'right' | null }
  | LayerBase & { kind: 'outside'; mass: Pt[]; spires: Spire[]; glyphs: GlyphDesc[]; sea: Pt[] | null }
  | LayerBase & { kind: 'marks'; glyphs: GlyphDesc[]; shine: Shine }
  | LayerBase & { kind: 'weather'; rain: RainField | null; shafts: Shaft[]; mist: MistBand[]; flash: number }
  | LayerBase & { kind: 'loading'; mode: 'mist' | 'ridge' | 'both'; ridge: Pt[] }

export type LayerKind = LayerDesc['kind']
export type LayerOf<K extends LayerKind> = Extract<LayerDesc, { kind: K }>

/** HTML over the land, placed from the model: positions in scene px (x as `box.width` scales it). */
export type OverlayItem =
  /** `x` the label's centre, `y` its top. */
  | { kind: 'height'; text: string; x: number; y: number; below: boolean }
  /** `x` the note's left edge, `y` its top. */
  | { kind: 'datum' | 'water'; text: string; x: number; y: number }
  | { kind: 'dot'; x: number; y: number }

export interface SceneModel {
  layers: LayerDesc[]
  overlay: OverlayItem[]
  /** Text and dot zones (land px) that nothing drawn may cover. */
  clear: Box[]
}
