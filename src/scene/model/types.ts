import type { ReceiverShadow } from './planeCloudShadow'
import type { CanopyTones } from './canopyTones'
import type { NeighbourEvidence } from './neighbourEvidence'
import type { CityTier } from './cityMass'
export type { CityTier } from './cityMass'
import type { GlyphKind, IconKind } from '../../world/glyphSpecs'
import type { Pt, RGB } from '../../world/types'
import type { BirdKind } from '../../world/life'
import type { PlantWind } from './landWind'
import type {
  CanopyVegetation, Dot, Face, Grain, Gully, LightPart, OutsideLandDesc, Path, PlaneLight, PlaneLitField, PlanePalette, PlaneVegetation,
} from './typesLand'

export type {
  CanopyVegetation, Dot, Face, Grain, Gully, LightPart, OutsideLandDesc, Path, PlaneLight, PlaneLitField, PlanePalette, PlaneVegetation,
}
import type { ContrailMotion } from './contrailMotion'
import type { CloudSprite } from '../paint/cloudSprite'

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

/**
 * CSS px. `width` is the land figure's; `landTop` (and `landLeft`) where the figure's top-left stands in the sky surface;
 * `skyWidth` the sky surface's width when it differs from the figure's (the app's sky spans the window, the figure a
 * column); `dpr` the device pixel ratio.
 */
export interface SceneBox { width: number; skyHeight: number; landTop: number; landHeight: number; dpr: number
  skyWidth?: number; landLeft?: number }

export interface Box { x: number; y: number; w: number; h: number }

export type LayerId = string
export type Surface = 'sky' | 'land' | 'wear'

/**
 * An animated layer: the loop runs while one is present (C6–C8). Everything here is applied when the cached canvas is
 * laid into the surface (`anim.ts`: a pure function of the spec and `phase`), so an animated frame repaints nothing.
 */
export interface AnimSpec {
  /**
   * `drift`: the cached sprite is translated and/or pulsed (no repaint); `frames`: the layer's canvas is a strip of
   * pre-painted frames, one laid per tick (C7: water, smoke, swaying trees); `fall`: the canvas is a tile of falling marks
   * laid as a moving pattern over `fall.areas` (C7: rain, snow); `settle`: the layer is only laid with the arrival's own
   * motions below (C8); `sway`: the clothesline's sprites laid through their gust's transform (`sway`). Never a repaint
   * per frame.
   */
  mode: 'drift' | 'frames' | 'fall' | 'settle' | 'sway'
  /** Surface px/s across, for `drift` (+ left → right). */
  speed?: number
  /**
   * Surface px the drift has already carried the layer at phase 0 (the shown minute's: the cloud shadows' wind since
   * midnight), so a scrub moves it with no repaint.
   */
  offset?: number
  /** A constant alpha the layer is laid with (the cloud shadows' strength at the minute), so it changes with no repaint. */
  alpha?: number
  /**
   * The drift repeats every `period` px: the layer's canvas is laid every `period` px across the surface (a tileable
   * band: the clouds round the whole horizon, a shimmer tile). A whole number of device px.
   */
  period?: number
  /** Flashes (lightning): the layer is laid with the alpha of a seeded schedule of flashes (`flashAt`). */
  pulse?: Pulse
  /** Carried by the wind from the shown minute, each band at its own speed (`Advect`). */
  advect?: Advect
  /**
   * A strip of `count` frames (C7), painted at phases `i / fps` and stacked down the layer's canvas (each `bounds` high);
   * the frame at `phase` is laid (`frameAt`). The motion loops every `count / fps` s, so a painter's motion must be
   * periodic over it.
   */
  frames?: { count: number; fps: number }
  /** Falling marks (C7): the layer's canvas is a tile laid as a pattern over these areas, moving with the phase (`fallAt`). */
  fall?: Fall
  /** The layer's alpha goes from `from` to `to` over `at … at + dur` s of the phase, eased (C8: the land in, the mist out). */
  fade?: Ramp
  /**
   * A line made from the place outward (C8): the layer is laid only within `x ± reach(phase)`, its ends feathered, the
   * reach growing over `at … at + dur` s to the whole width; `erase` lays it only outside that window (the guess unmade as
   * the true line is drawn over the same front). Under reduced motion `still` says what shows: the whole layer, or nothing.
   */
  reveal?: Reveal
  /**
   * The layer is laid `dy` surface px off its place, gliding to its place over `at … at + dur` s (C8: the sky, drawn on
   * the land's own eye level once the land is known, settles there from the guessed one). Applied only to a canvas painted
   * for this desc (a stale one stands where it was painted).
   */
  glide?: { dy: number; at: number; dur: number }
  /** A slow breath of the alpha, `1 − depth … 1` over `period` s (C8: the forming ridge line). */
  breath?: { depth: number; period: number }
  /**
   * Lay the layer along a track relative to its origin (`trackAt`); may be combined with a sprite strip.
   */
  flight?: Track
  /**
   * The clothesline (`wear.ts`): the layer's sprite laid through an affine about `pivot` that follows one cycle of gusts
   * (`anim.ts` `swayAt`): lifted with the line, sheared at the hem (pegged cloth), turned about its hook (hooked things),
   * the rope's sag eased. Applied after `flight` (a drip falls in the frame of what it drips from).
   */
  sway?: Sway
}

/**
 * Where a layer painted round its own origin is laid (the sky's life, continuous in time): its canvas laid with its origin at
 * (`x`, `y`) surface px, with a base scale, opacity and optional rotation in radians. The compositor applies motion on
 * top of that pose. `above` clips to this surface y when a copy on the other surface takes the rest.
 */
export interface Lay { x: number; y: number; scale: number; alpha: number; turn?: number; above?: number }

/**
 * A layer carried by the wind from the minute it shows: its canvas cut into bands, each from `y` (surface px) down to the
 * next band's, laid `speed` surface px/s across × the seconds since `from` (the minute's phase; `anim.ts` caps it). The
 * speeds follow perspective (fast overhead, slow at the horizon), so the field's next minute takes over where this left.
 */
export interface Advect { from: number; bands: readonly { y: number; speed: number }[] }

/** When the shown time was laid on the scene timeline, and how far it was already into that minute (seconds). */
export interface LifeClock { laidAt: number; sinceS: number; still?: boolean }

/**
 * One cycle of gusts on the clothesline (`anim.ts` `gustAt`, the stops of the old line's `GUST`), as a transform of a
 * layer's sprite about `pivot` (surface px). With the line's gust `G` at the phase and the cloth's `g` at the phase plus
 * `delay` (−0.25…1), the layer stands `lift × G` px higher, scaled `1 + stretch × G` down from the pivot (the rope's sag
 * easing), sheared by `skew0 + skew × g` rad (x moves by its `tan` per px below the pivot) and turned `turn0 + turn × g`
 * rad. Under reduced motion both are 0: the rest pose (`skew0`, `turn0`).
 */
export interface Sway { pivot: Pt; period: number; delay: number; lift: number; skew: number; skew0: number; turn: number
  turn0: number; stretch: number }

/**
 * Offsets (surface px) every `step` seconds, read at phase + at. Closed tracks repeat every `cycle` seconds.
 * Open tracks hold their first and last points outside the sampled interval. Optional values are relative to the sprite.
 */
export type Track = { path: Pt[]; step: number; at: number; scale?: number[]; alpha?: number[]; turn?: number[]
  /** Exact azimuth span, relative to the placed origin, for tracks crossing the camera's rear seam. */
  wrapX?: { min: number; period: number } }
  & ({ open: true; cycle?: number } | { open?: false; cycle: number })

/** A timed ramp of the phase (s): from `from` to `to` over `at … at + dur`, eased in and out. */
export interface Ramp { at: number; dur: number; from: number; to: number }

/** A window grown from `x` (surface px) outward over `at … at + dur` s of the phase (`anim.ts` `revealAt`). */
export interface Reveal { x: number; at: number; dur: number; erase?: boolean; still: 'whole' | 'hide'; feather: number }

/**
 * Rain or snow falling (C7): the tile (the layer's canvas, its `bounds` the tile's size at 0, 0) laid as a repeating
 * pattern inside `areas` (closed polygons in surface px), the pattern moving `vx`, `vy` px/s (wrapped by the tile), swaying
 * `sway` px across over `swayPeriod` s (snow). With the spec's `speed` and `period` the areas drift with their cloud layer,
 * repeated every `period` px; `alpha` per area.
 */
export interface Fall { vx: number; vy: number; areas: Pt[][]; alphas?: number[]; sway?: number; swayPeriod?: number }

/** A one-shot meteor or a seeded lightning schedule (default cycle 600 s). */
export type Pulse = { first: number } & (
  { look: 'meteor' } | { look?: 'stroke'; seed: number; every: [number, number]; cycle?: number; strength?: number }
)

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
  /** Laid where its object is now (`Lay`): the layer's bounds and coordinates are round its own origin. */
  placed?: Lay
  /** How its canvas meets the surface under it (`source-over` when absent). */
  blend?: 'source-over' | 'source-atop' | 'multiply'
}

/* Shapes drawn from C2 on (placeholders, refined by the stage that draws them). */
/** A soft round glow (sky px): `alpha` at the centre falling to nothing at `r`; `ry` squashes it into an ellipse. */
export interface Glow { x: number; y: number; r: number; rgb: RGB; alpha: number; ry?: number }
export interface Band { y: number; h: number; rgb: RGB; alpha: number }
/**
 * Earth's shadow and the belt of Venus round sunset and sunrise, opposite the sun: a blue-grey band on the horizon
 * (`shadow` px high) under a pink one (to `belt` px), fading sideways over `rx` px from `x`.
 */
export interface Arch { x: number; y: number; rx: number; shadow: number; belt: number; shadowRgb: RGB; beltRgb: RGB; alpha: number }
export interface Star { x: number; y: number; r: number; alpha: number }
/**
 * The sun's disc (C6): its core and darker, redder limb (limb darkening), squashed by refraction (`flatten`), with a close
 * aureole (`halo`, strength `aureole`) of forward-scattered light. `veil` 0–1: the cloud in front softens and dims it.
 * `coin`: dust turns it into a flat pale coin with no halo.
 */
export interface Disc { x: number; y: number; r: number; rgb: RGB; veil: number; core: RGB; limb: RGB; halo: RGB; aureole: number;
  flatten: number; coin: number }
/**
 * The moon (C6): its true phase (`fraction` lit), the lit limb turned toward the sun (`tilt`, deg), bone by night and
 * sky-pale by day (`daylight`), `alpha` after cloud and haze; `ring`: the dark disc's hairline for a thin crescent;
 * `earthshine`: the dark part's faint light by night.
 */
export interface MoonDisc { x: number; y: number; r: number; rgb: RGB; alpha: number; fraction: number; tilt: number; daylight: number
  ring: boolean; earthshine: number }
/**
 * A cloud rain or snow falls from, as drawn (C7, `falling.ts`), in sky px on the band (`x` its centre in `0…period`, `y`
 * its base on the dome): its size, its tones in the hour's light (`body`, and `shade` underneath), its strength, and where
 * it truly is (`altitude` of its base, deg; `distanceKm`) with the share of the rain it makes.
 */
export interface FallingCloud { id: string; x: number; y: number; w: number; h: number; seed: number; alpha: number
  body: RGB; shade: RGB; altitude: number; distanceKm: number; share: number }
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
/**
 * Wind ruffle: ripples catching the low sky (`light`) and the high sky (`dark`), their number and length by the wind; each
 * ripple runs `drift` px downwind over one loop of the water's strip of frames (C7), rising and falling as it goes.
 */
export interface Ruffle { light: RGB; dark: RGB; lit: Streak[]; shade: Streak[]; drift: number }
/** The light's path on the water under the sun or moon, widening toward the eye with the waves' slope. */
export interface GlintPath { x: number; top: number; bottom: number; spread: number; rgb: RGB; alpha: number; sparks: Streak[] }
export interface Line { x1: number; x2: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number; rgb: RGB }
/** A block of a far town (or a far tower), standing on `base`, `km` away. */
export interface CityBlock { x: number; base: number; w: number; h: number; km: number }
/** A lit window of a far town by night: a point with a faint halo, through the haze (Allard). */
export interface CityLight { x: number; y: number; r: number; alpha: number }
/**
 * One thing of the place seen from outside (stage C5), in paint order (back to front), screen px, its tones by `tier`
 * (the layer's tones per distance): a built square of the mass (`box`: its front from `top` to `foot`, `storeys` from its
 * real roof height, `folded` a tower folded into the mass), a tower (`full`: the famous or ≥ 150 m, a full tower; else a
 * spire's silhouette; `crown` 0 flat, 1 a setback, 2 a mast), or a mark of the place (a glyph or an icon, its own tones).
 */
export type OutsideItem =
  | { kind: 'box'; x: number; w: number; top: number; foot: number; tier: number; seed: number; storeys: number; folded: boolean
      /** A house's roof (tile or flat, a heater on some flat ones); null for a block of the mass. */
      roof: 'tile' | 'flat' | null; heater: boolean
      /** C9: a block of a town beyond the place (drawn behind it, far first). */
      beyond?: true }
  | { kind: 'tree'; tree: TreeDesc; tier: number }
  | { kind: 'tower'; x: number; base: number; w: number; h: number; tier: number; seed: number; crown: 0 | 1 | 2; full: boolean
      famous: boolean; storeys: number }
  | { kind: 'mark'; glyph: GlyphDesc }

/**
 * A coastal place's own sea seen from outside (C5): its outline (screen px), the water's tones down the band (far → near:
 * the sky mirrored by Fresnel over the water's dark, after the air), the shore's tone along the coast, the light's path
 * on it, ripples catching the low sky (`light`) and the high (`dark`).
 */
export interface SeaDesc {
  points: Pt[]
  coast: Pt[]
  top: number
  bottom: number
  stops: [number, RGB][]
  shore: RGB
  glint: { x: number; rgb: RGB; alpha: number; sparks: Streak[] } | null
  ripples: Streak[]
  /** C7: how far (px) a ripple runs downwind over one loop of the layer's strip (signed like the wind across). */
  drift?: number
  light: RGB
  dark: RGB
  /** The sea's horizon: a fine light line, level, from the shore to the edge (C5b). */
  horizon: { y: number; x0: number; x1: number; rgb: RGB; alpha: number }
}
export type { GlyphKind, IconKind }

/** The light the outside view's mass takes from the sky (C5b): its strength, the brighter sky's side, tones per tier. */
/** `side`: −1…1, the brighter sky's side (+ left) and how far toward it the sun's part of the sky stands (continuous). */
export interface SkyForm { strength: number; side: number; tiers: { top: RGB; face: RGB; foot: RGB }[] }

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
  /**
   * The living light: the light each face takes by its normal (`livingLight.ts` `faceLight`, 0–1, the direct share in it):
   * the front (toward the eye), the left and right sides, the top; `rim` a back-lit edge's; `across` the light's signed
   * side (−1 left … 1 right, 0 straight ahead or behind or with no direct light). Painters mix each face from its base
   * toward `Tones.lit` by its own share. Glyphs use `left - right` as signed light in screen space.
   */
  faces: { front: number; left: number; right: number; top: number; rim: number; across: number }
  /** A low sun's glint in the windows of the faces turned to it (0–1). */
  glint?: number
  cast: { dx: number; length: number; alpha: number }
  windows: number
  /** Continuous aviation lamp strength (0–1). */
  aviationStrength: number
  lean: number
  /** C7: how far (rad) trees sway about their lean in the gusts, over the portrait's strip of frames; 0 in a calm. */
  sway?: number
}

export interface GlyphDesc extends NeighbourEvidence {
  kind: GlyphKind
  /** Centre x and base y (px); drawn height in glyph px; px per glyph px; box width (px). */
  x: number
  base: number
  h: number
  scale: number
  w: number
  seed: number
  /** Fixed horizontal orientation in the scene, from the mark seed or its known orientation. */
  hand: 1 | -1
  tones: Tones
  famous: boolean
  /** A field's ground under it: y (px, relative to `base`) every glyph px across its width, west to east. */
  ground?: number[]
}

/** Where the line is tied (surface px): the tab of ground and the turns of rope round it. */
export interface WearEnd { x: number; y: number; w: number; rgb: RGB; side: -1 | 1 }
/** A raindrop hanging under the rope (surface px). */
export interface WearBead { x: number; y: number; r: number }

/**
 * A garment or a piece of gear on the line (`wear.ts`), drawn in its own frame (`model/wearKit.ts`: (0, 0) where the rope
 * passes, y down) placed at `x`, `y` (surface px), turned `tilt` rad to the rope's chord between its pegs and scaled
 * `scale` (surface px per garment unit). Tones after the light, the night, the rain and the dust; `side` the screen
 * side the light comes from (−1 left, 1 right, 0 none) and `shine` how strongly.
 */
export interface WearItem {
  garment: string
  x: number
  y: number
  tilt: number
  scale: number
  /** The cloth stretched by its own wet weight (vertical scale, ≥ 1). */
  hang: number
  pegTilts: number[]
  side: -1 | 0 | 1
  shine: number
  /** The living light (`wear.ts` `wearLight`): the side light's signed strength, the light on the front, through the back, from above. */
  across: number
  front: number
  back: number
  up: number
  tones: { body: RGB; lit: RGB; shade: RGB; deep: RGB; rim: RGB; seam: RGB; edge: RGB; tag: RGB; peg: RGB; pegEdge: RGB
    pegLight: RGB; spring: RGB; glint: RGB; water: RGB; cord: RGB; glow: RGB }
  /** A neighbour's shadow on it (the light running along the line): its outline at (dx, dy) garment units, at `alpha`. */
  cast?: { garment: string; dx: number; dy: number; alpha: number }
  /** 0–1: rain on it (darker, beaded), snow lying on its shoulders, dust dulling it. */
  wet: number
  snow: number
  dust: number
  seed: number
}

/** A tree (px): `x` its centre. */
export interface TreeDesc { kind: 'tree' | 'cypress' | 'palm'; x: number; base: number; w: number; h: number; seed: number }
/*
 * Weather (C7). Every shape here comes from the world: the raining (or snowing) banks, the one wind, the light, the air's
 * humidity and visibility, the ground's wetness, the marks that smoke.
 */
/** Rain or snow falling. */
export type Precip = 'rain' | 'snow'
/**
 * A curtain of rain or snow under a bank (sky px, on its cloud layer's band): from the cloud's base (`top`, under the bank)
 * to the ground at the horizon (`bottom`), `w` wide under the bank, its foot carried `lean` px downwind by the one wind;
 * the curtain's body in `rgb` at `alpha`, its striations seeded.
 */
export interface ShaftDesc { id: string; x: number; top: number; bottom: number; w: number; lean: number; rgb: RGB; alpha: number; seed: number }
/** A mark in a falling tile (tile px): a rain streak `len` px long along the slant, or a snow flake of radius `r`. */
export interface FallMark { x: number; y: number; len: number; r: number; alpha: number }
/** A soft puff of mist in a band (tile px). */
export interface MistPuff { x: number; y: number; rx: number; ry: number; alpha: number }
/**
 * A bank of mist lying level (land px): the body from `top` (fading in over `fade` px) down to `bottom`, and the soft
 * puffs along its top that drift with the wind; laid over the tile's width, repeating.
 */
export interface MistBandDesc { top: number; fade: number; bottom: number; rgb: RGB; alpha: number; puffs: MistPuff[] }
/** A crepuscular ray: a wedge from the source (rad from straight up, + toward the right), lit or shadowed. */
export interface Ray { angle: number; width: number; alpha: number; lit: boolean }
/** A plume of smoke or steam (land px): from its stack's top, carried by the wind (`dx`, `dy` px over its length). */
export interface Plume { x: number; y: number; dx: number; dy: number; r0: number; r1: number; rgb: RGB; lit: RGB; alpha: number
  puffs: number; seed: number }
/** A wet sheen on the ground: a short level stroke catching the sky (land px). */
export interface Sheen { x: number; y: number; w: number; alpha: number }

/*
 * Sky life and optics (C10). Everything here comes from the world's `life`, `nightSky` and `optics`.
 */
export type { BirdKind }
/**
 * A bird of a flock (sprite px): where it flies round in the flock (`x`, `y` the middle of its own loop of `rx` × `ry`,
 * `turn` +1 or −1 the way round, `lag` its place on the loop 0–1), its wingspan (`size`) and its wing beat's own lag.
 */
/** A bird of a flock round its middle (world px: x across, y up, z away), its own flight's radius and rise, its way round, phase, span, wing phase. */
export interface BirdDesc { x: number; y: number; z: number; rx: number; ry: number; turn: 1 | -1; lag: number; size: number; beat: number }
/** A planet as drawn (sky px): a steady point (`r`), its colour, how plainly it shows, a faint glow round the brightest. */
export interface PlanetDot { name: string; x: number; y: number; r: number; rgb: RGB; alpha: number; glow: number }
/** A sun dog (sky px): where it stands, its size, strength, and which side of the sun it is on (−1 left, +1 right). */
export interface SunDog { x: number; y: number; r: number; alpha: number; side: -1 | 1 }

export type LayerDesc =
  | LayerBase & { kind: 'sky'; stops: [number, RGB][]; glow: Glow[]; arch: Arch | null; band: Band | null }
  | LayerBase & { kind: 'stars'; stars: Star[]; through: number }
  /**
   * The sun or the moon round its disc; `part` (C9): `aureole`, the sun's aureole alone, laid over the clouds. (A disc laid
   * again over the place's own mass, C9's `over`, is gone: whatever is drawn in front of a body hides it.)
   */
  | LayerBase & { kind: 'bodies'; sun: Disc | null; moon: MoonDisc | null; part?: 'aureole' }
  /** In-cloud lightning: one raining cloud lit from within, laid with a flash schedule's alpha and drifting with its rain. */
  | LayerBase & { kind: 'flash'; cloud: FallingCloud; rgb: RGB; period: number }
  /** Heat shimmer over the horizon: fine wavering lines of light in a tile that drifts with the wind. */
  | LayerBase & { kind: 'shimmer'; lines: { y: number; amp: number; waves: number; phase: number; alpha: number }[]; rgb: RGB }
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB; surfaceTone: PlanePalette;
      gullies: Gully[]; terraces: Path[]; vegetation: PlaneVegetation; grain: Grain; light: PlaneLight; canopyId?: string; cloudShadow?: ReceiverShadow }
  | LayerBase & { kind: 'canopy'; outline: Pt[]; vegetation: CanopyVegetation; wind: PlantWind; clear: readonly Box[]; receiver?: { form: string }; cloudShadow?: ReceiverShadow;
      tones?: CanopyTones; shadedTones?: CanopyTones & { key: string } }
  | LayerBase & { kind: 'water'; bands: WaterBand[]; ruffle: Ruffle; glints: GlintPath[];
      datum: { y: number; segments: { x1: number; x2: number; fadeLeft: number; fadeRight: number }[]; rgb: RGB; alpha: number } | null }
  /** `litFace` (C9): the share of a block's width its lit face shows (a sliver, a rim, against the light). */
  | LayerBase & { kind: 'farCities'; tiers: CityTier[]; lights: CityLight[]; lightRgb: RGB; litFace?: number
      /** Signed face-light difference, positive from screen-left. */
      lateralLight: number }
  | LayerBase & { kind: 'outside'; items: OutsideItem[]; tiers: Tones[]; sea: SeaDesc | null; shine: Shine
      /** The place's own ground over the ridge line (C5b + Stage 3): its top/base lines, living-land tone stops and crest. */
      land: OutsideLandDesc | null
      form: SkyForm }
  | LayerBase & { kind: 'marks'; glyphs: GlyphDesc[]; shine: Shine }
  /** Rain or snow curtains under the banks that rain or snow (sky, drifting with their cloud layer). */
  | LayerBase & { kind: 'shafts'; precip: Precip; shafts: ShaftDesc[]; period: number }
  /** A tile of falling rain streaks or snow flakes, laid over its areas as a moving pattern (`animated.fall`). */
  | LayerBase & { kind: 'fall'; precip: Precip; marks: FallMark[]; rgb: RGB; slant: number }
  /** Mist and fog lying in the low ground, a tile drifting with the wind. */
  | LayerBase & { kind: 'mist'; bands: MistBandDesc[] }
  /** Dust in the wind, or wind streaks: a tile of fine streaks drifting across. */
  | LayerBase & { kind: 'grains'; marks: FallMark[]; rgb: RGB }
  | LayerBase & { kind: 'landDust'; puffs: MistPuff[]; rgb: RGB }
  /** Crepuscular rays from a low sun behind broken cloud: lit and shadowed wedges from `x`, `y`, fading over `reach`. */
  | LayerBase & { kind: 'rays'; x: number; y: number; reach: number; rays: Ray[]; rgb: RGB; shade: RGB
    /** C9: `fan` (beams and shadows fading along their length) or `corona` (fine glare round the disc, brightest near it). */
    look?: 'fan' | 'corona' }
  /** Chimney smoke and cooling-tower steam carried by the wind (a strip of frames). */
  | LayerBase & { kind: 'smoke'; plumes: Plume[] }
  /** The wet ground's sheen after rain. */
  | LayerBase & { kind: 'sheen'; strokes: Sheen[]; rgb: RGB }
  /**
   * Rain or snow out of view: a heavy bank with its curtain cut by the frame's edge on the side the rain truly lies
   * (`side`), over the horizon.
   */
  | LayerBase & { kind: 'edge'; precip: Precip; side: 'left' | 'right'; x: number; y: number; w: number; h: number; body: RGB; shade: RGB
      curtain: RGB; alpha: number; lean: number; seed: number }
  /**
   * The land not known yet (C8): `mist` the bank lying in the land's place, in the hour's air and light (a tile drifting
   * with the ground wind); `ridge` a faint ridge line forming in it (`guess`: a generic soft line while the land loads;
   * `crest`: the true near crest, drawn over the same front as the land arrives), its glimpsed mass under it.
   */
  | LayerBase & { kind: 'loading'; part: 'mist'; bands: MistBandDesc[]; lit: RGB; litAlpha: number }
  | LayerBase & { kind: 'loading'; part: 'ridge'; line: Pt[]; rgb: RGB; alpha: number; mass: number; seed: number }
  /**
   * C10: a flock (or a lone bird) in the sky, painted round its middle and laid where it is (`placed`), a strip of frames
   * (`animated.frames`: its wing beats and its own wheeling, periodic over the strip's `loop` s) and a slow sway round its
   * place (`animated.flight`, a closed loop); `flap` beats a second, `soar` 0–1 the
   * share of time the wings are held (storks, raptors), the flock's tones (`rgb` its dark, `lit` the sunlit underside).
   */
  | LayerBase & { kind: 'birds'; bird: BirdKind; birds: BirdDesc[]; loop: number; flap: number; soar: number; rgb: RGB; lit: RGB;
      litA: number
      /** The flock's way in the eye's frame (rad from across-right toward away) and how far up it is seen (deg). */
      yaw: number; view: number; seed: number }
  /**
   * C10: an aircraft (sky px): a small plane at (`x`, `y`) heading `angle` (rad on screen), `size` its span, its body's tones,
   * its lights by night (`lights` 0–1: the landing light, the strobe and the beacon, a strip of frames), the short trail
   * behind it (`trail`: px, 0 for none).
   */
  | LayerBase & { kind: 'aircraft'; x: number; y: number; angle: number; size: number; rgb: RGB; lit: RGB; lights: number; landing: boolean
      trail: number; trailRgb: RGB; seed: number }
  /** C10: a contrail's dated emissions, composed as a ribbon with age-dependent width and opacity. */
  | LayerBase & { kind: 'contrail'; trail: ContrailMotion; rgb: RGB; shade: RGB }
  /** C10: a meteor's streak from `x0`, `y0` to its end, laid with its pulse (`animated.pulse`, the meteor look). */
  | LayerBase & { kind: 'meteor'; x0: number; y0: number; x1: number; y1: number; width: number; rgb: RGB }
  /** C10: the planets, steady points (they do not twinkle). */
  | LayerBase & { kind: 'planets'; planets: PlanetDot[] }
  /** C10: a star that twinkles (a strip of frames: its light flickering, seeded, periodic over the strip). */
  | LayerBase & { kind: 'twinkle'; star: Star; amp: number; seed: number; loop: number }
  /**
   * C10: the Milky Way's band (sky px): its spine and edges at its true place, and along it its brightness, the dark rift,
   * the bright star clouds (Sagittarius, Scutum, Cygnus), its colour and strength.
   */
  | LayerBase & { kind: 'milkyWay'; spine: Pt[]; upper: Pt[]; lower: Pt[]; bright: number[]; rift: number[]; clouds: number[]; rgb: RGB
      alpha: number; seed: number }
  /**
   * C10: a rainbow round the antisolar point or a 22° halo round the sun, each a true circle in the sky's tangent frame at
   * its centre (`cx`, `cy`; `k` px per degree), hidden under the land by `clip` (the sky's outline down to the land). The
   * rainbow's strength round its circle is `mask` (alphas at equal screen angles from +x, clockwise on screen); the halo
   * has its sun dogs.
   */
  | LayerBase & { kind: 'bow'; look: 'rainbow' | 'halo'; cx: number; cy: number; k: number; strength: number; secondary: number; mask: number[]
      dogs: SunDog[]; clip: Pt[] }
  /**
   * The "מה ללבוש" clothesline (`wear.ts`), on its own surface in the card: the rope (or the stretch of it in front of a
   * hook's far arm, `part: 'bit'`), each garment as a sprite, and the drops that fall from wet cloth.
   */
  | LayerBase & { kind: 'wearRope'; part: 'line' | 'bit'; points: Pt[]; width: number; rgb: RGB; lay: RGB; ends: WearEnd[]
      beads: WearBead[]; snow: number; seed: number }
  | LayerBase & { kind: 'wearItem'; item: WearItem }
  /**
   * One field layer drawn as a continuous sheet over the dome (SPEC §6.0), in sky px. A grid of screen rays: `xs` the
   * column centres, `ys` the row centres (top to bottom, denser toward the horizon, where the deck compresses). Per node
   * (row-major, `ys.length × xs.length`): `alpha` the drawn coverage after the soft threshold, 0–1; `tone` 0 lit to 1
   * shade (from τ and the light at the node). `body`, `shade` and `lit` the layer's colours at this hour.
   */
  | LayerBase & { kind: 'cloudSheet'; lattice: 'low' | 'tower' | 'mid' | 'high'; genus: string
      xs: number[]; ys: number[]; alpha: number[]; tone: number[]; body: RGB; shade: RGB; lit: RGB
      /** Per row of `ys`: how fast the wind carries it across, surface px/s (+ left → right). */
      speeds: number[] }
  /** The field's towers as sprites (sky px, far first), each at its cell's place and its across-wind speed (px/s). */
  | LayerBase & { kind: 'cloudCells'; lattice: 'tower'; cells: { sprite: CloudSprite; x: number; y: number; speed: number }[] }
  | LayerBase & { kind: 'wearDrip'; x: number; y: number; r: number; rgb: RGB; lit: RGB }

export type LayerKind = LayerDesc['kind']
export type LayerOf<K extends LayerKind> = Extract<LayerDesc, { kind: K }>

/** HTML over the land, placed from the model: positions in scene px (x as `box.width` scales it). */
export type OverlayItem =
  /** `x` the label's centre, `y` its top. */
  | { kind: 'height'; text: string; x: number; y: number; below: boolean; backed?: boolean }
  /** `x` the note's left edge, `y` its top. */
  | { kind: 'datum' | 'water'; text: string; x: number; y: number }
  | { kind: 'dot'; x: number; y: number }

/**
 * The land's arrival in time (C8), kept by the React shell, which alone reads the clock, as phases of the scene's one
 * animation clock (s from the page's scene epoch, the phase every loop lays at, so a new model never starts a motion
 * again): when the mist began (`loadingAt`), and once the land is in, when its reveal began (`reveal.at`; null while the
 * land's layers are still being painted: held at its start), the eye level the sky stood on before it (`fromHorizonY`,
 * land px) and whether a guess line was forming (`guessed`: not offline). A frame is a pure function of the model and
 * the phase.
 */
export interface LandClock { loadingAt: number; reveal?: { at: number | null; fromHorizonY: number; guessed: boolean } | null }

export interface SceneModel {
  layers: LayerDesc[]
  overlay: OverlayItem[]
  /** Text and dot zones (land px) that nothing drawn may cover. */
  clear: Box[]
}
