import type { Pt } from '../../../world/types'

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
