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

/**
 * CSS px. `width` is the land figure's; `landTop` (and `landLeft`) where the figure's top-left stands in the sky surface;
 * `skyWidth` the sky surface's width when it differs from the figure's (the app's sky spans the window, the figure a
 * column); `dpr` the device pixel ratio.
 */
export interface SceneBox { width: number; skyHeight: number; landTop: number; landHeight: number; dpr: number
  skyWidth?: number; landLeft?: number }

export interface Box { x: number; y: number; w: number; h: number }

export type LayerId = string
export type Surface = 'sky' | 'land'

/**
 * An animated layer: the loop runs while one is present (C6–C8). Everything here is applied when the cached canvas is
 * laid into the surface (`anim.ts`: a pure function of the spec and `phase`), so an animated frame repaints nothing.
 */
export interface AnimSpec {
  /**
   * `drift`: the cached sprite is translated and/or pulsed (no repaint); `frames`: the layer's canvas is a strip of
   * pre-painted frames, one laid per tick (C7: water, smoke, swaying trees); `fall`: the canvas is a tile of falling marks
   * laid as a moving pattern over `fall.areas` (C7: rain, snow); `settle`: the layer is only laid with the arrival's own
   * motions below (C8). Never a repaint per frame.
   */
  mode: 'drift' | 'frames' | 'fall' | 'settle'
  /** Surface px/s across, for `drift` (+ left → right). */
  speed?: number
  /**
   * The drift repeats every `period` px: the layer's canvas is laid every `period` px across the surface (a tileable
   * band: the clouds round the whole horizon, a shimmer tile). A whole number of device px.
   */
  period?: number
  /** Flashes (lightning): the layer is laid with the alpha of a seeded schedule of flashes (`flashAt`). */
  pulse?: Pulse
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
}

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

/** A seeded schedule of short flashes: the first after `first` s, then every `every[0]`…`every[1]` s. */
export interface Pulse { seed: number; first: number; every: [number, number] }

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
 * A cloud bank as drawn (C6), in sky px on its layer's band (`x` its centre in `0…period`, `y` its base): the shape
 * (`kind`: heaped cumulus, a flat sheet of a deck, a cirrus streak), its tones after the light (`body` in the sky's light,
 * `shade` on the side turned away, `lit` on the side toward the light with strength `litA`), the direction the light comes
 * from on screen (`toward`, a unit vector; null under a sky with no direct light), a lit underside at a low sun (`under`),
 * the silver edge of a bank near the sun (`silver`), and a darker base under a bank that rains.
 */
export interface BankDesc { id: string; x: number; y: number; w: number; h: number; puffs: number; seed: number
  kind: 'heap' | 'sheet' | 'streak'; alpha: number; body: RGB; shade: RGB; lit: RGB; litA: number
  toward: readonly [number, number] | null; under: number; silver: number; rains: boolean }
/** A flat wash under a deck (overcast): the sky's cover between `top` and `bottom`, fading out toward the horizon. */
export interface Veil { top: number; bottom: number; rgb: RGB; alpha: number }
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
/**
 * The far towns at one distance (C3): their mass (the town as the eye resolves it: cells of the built-share field, one
 * strength step each) and the blocks rising from it with a lit face toward the light, in tones after the air at `km`;
 * drawn far to near.
 */
export interface CityTier { km: number; lit: RGB; shade: RGB; mass: { alpha: number; boxes: Box[] }[]; blocks: CityBlock[] }
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
export interface SkyForm { strength: number; side: -1 | 0 | 1; tiers: { top: RGB; face: RGB; foot: RGB }[] }

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
  /** C7: how far (rad) trees sway about their lean in the gusts, over the portrait's strip of frames; 0 in a calm. */
  sway?: number
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

export type LayerDesc =
  | LayerBase & { kind: 'sky'; stops: [number, RGB][]; glow: Glow[]; arch: Arch | null; band: Band | null }
  | LayerBase & { kind: 'stars'; stars: Star[]; through: number }
  /**
   * The sun or the moon round its disc; `part` (C9): `aureole`, the sun's aureole alone, laid over the clouds; `over`, the
   * disc with its inner glow on the land, over the place's own mass (`bodiesOverPlace`).
   */
  | LayerBase & { kind: 'bodies'; sun: Disc | null; moon: MoonDisc | null; part?: 'aureole' | 'over' }
  | LayerBase & { kind: 'clouds'; level: CloudLevel; banks: BankDesc[]; veil: Veil | null; period: number }
  /** In-cloud lightning: one bank drawn lit from within, laid with a flash schedule's alpha and drifting with its layer. */
  | LayerBase & { kind: 'flash'; bank: BankDesc; rgb: RGB; period: number }
  /** Heat shimmer over the horizon: fine wavering lines of light in a tile that drifts with the wind. */
  | LayerBase & { kind: 'shimmer'; lines: { y: number; amp: number; waves: number; phase: number; alpha: number }[]; rgb: RGB }
  | LayerBase & { kind: 'plane'; plane: 'back' | 'far' | 'near'; outline: Pt[]; fill: RGB; gullies: Gully[];
      terraces: Path[]; scrub: Dot[]; grain: Grain; light: PlaneLight }
  | LayerBase & { kind: 'water'; bands: WaterBand[]; ruffle: Ruffle; glints: GlintPath[];
      datum: { y: number; segments: { x1: number; x2: number; fadeLeft: number; fadeRight: number }[]; rgb: RGB; alpha: number } | null }
  /** `litFace` (C9): the share of a block's width its lit face shows (a sliver, a rim, against the light). */
  | LayerBase & { kind: 'farCities'; tiers: CityTier[]; litSide: 'left' | 'right' | null; lights: CityLight[]; lightRgb: RGB; litFace?: number }
  | LayerBase & { kind: 'outside'; items: OutsideItem[]; tiers: Tones[]; sea: SeaDesc | null; shine: Shine
      litSide: 'left' | 'right' | null
      /** The place's own ground over the ridge line (C5b): its top line and the ridge line under it, its tone and crest. */
      land: { top: Pt[]; base: Pt[]; tone: RGB; rim: RGB
        /** Snow lying on it (C9): its colour and cover, over the runs of top points (first, last index) at or over the line. */
        snow: { rgb: RGB; alpha: number; runs: [number, number][] } | null } | null
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
