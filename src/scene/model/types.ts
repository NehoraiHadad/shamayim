import type { MarkKind } from '../../data/landmarks/types'
import type { CloudLevel, Pt, RGB } from '../../world/types'

/**
 * The scene model (docs/design/CANVAS-SCENE-PLAN.md §1b): what is drawn, where, in which colour and order, decided
 * from the world state alone. Pure data: no canvas, no DOM. Painters (`scene/paint/`) only add the hand.
 *
 * Coordinates: sky layers in sky px (the sky surface's box, `0…box.width × 0…box.skyHeight`); land layers in scene px
 * (the figure's box, `0…box.width × 0…box.landHeight`; the world's 375 px reference width scaled by `box.width`, heights
 * as they are). The sky's horizon is the land's eye level offset by `box.landTop`. Colours are sRGB 0–1.
 *
 * Stage C1 is the skeleton: every kind is declared, the sky and the planes are filled in (flat); the shapes marked
 * "C2…C8" are placeholders for the stage that draws them and will be refined there.
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
  /** How the light canvas meets the form under it: C1 covers it (`source-over`); C2's lit faces may `multiply`. */
  blend: 'source-over' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  /** The plane's tone after light and haze over its whole shape (C1: flat; C2 adds lit faces and shadows). */
  tint: RGB
  faces: Face[]
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
export interface Face { points: Pt[]; rgb: RGB; alpha: number }
export type Path = Pt[]
export interface Dot { x: number; y: number; r: number; rgb: RGB }
export interface Grain { amount: number; seed: number }
export interface WaterBand { points: Pt[]; rgb: RGB }
export interface GlintPath { points: Pt[]; rgb: RGB; alpha: number }
export interface Line { x1: number; x2: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number; rgb: RGB }
export interface PortraitItem { kind: 'house' | 'tree' | 'cypress'; x: number; base: number; w: number; h: number; tones: Tones; seed: number }
export interface Spire { x: number; base: number; w: number; h: number; tones: Tones }
export interface Tones { lit: RGB; shade: RGB; body: RGB; open: RGB; roof: RGB }
export type IconKind = 'westernWall' | 'babShrine' | 'azrieli' | 'chordsBridge'
export interface GlyphDesc {
  kind: MarkKind | IconKind
  x: number
  base: number
  h: number
  seed: number
  litSide: 'left' | 'right' | null
  /** lit, shade, body, open, roof after light and haze. */
  tones: Tones
  /** Lit windows by night. */
  windows: number
  lean: number
  famous: boolean
}
export interface RainField { count: number; slant: number; rgb: RGB; alpha: number; seed: number }
export interface Shaft { x: number; w: number; top: number; rgb: RGB; alpha: number }
export interface MistBand { y: number; h: number; rgb: RGB; alpha: number }

export type LayerDesc =
  | LayerBase & { kind: 'sky'; stops: [number, RGB][]; glow: Glow[]; band: Band | null }
  | LayerBase & { kind: 'stars'; stars: Star[]; through: number }
  | LayerBase & { kind: 'bodies'; sun: Disc | null; moon: MoonDisc | null }
  | LayerBase & { kind: 'clouds'; level: CloudLevel; banks: BankDesc[] }
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB; faces: Face[]; gullies: Path[];
      terraces: Path[]; scrub: Dot[]; snow?: Pt[]; grain: Grain; light: LightPart }
  | LayerBase & { kind: 'water'; bands: WaterBand[]; glint: GlintPath | null; datum: Line | null }
  | LayerBase & { kind: 'farCities'; lights: Dot[]; blocks: Rect[] }
  | LayerBase & { kind: 'portrait'; items: PortraitItem[] }
  | LayerBase & { kind: 'outside'; mass: Pt[]; spires: Spire[]; glyphs: GlyphDesc[]; sea: Pt[] | null }
  | LayerBase & { kind: 'marks'; glyphs: GlyphDesc[] }
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
