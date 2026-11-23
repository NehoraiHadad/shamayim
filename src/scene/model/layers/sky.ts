import type { RGB } from '../../../world/types'
import type { LayerBase } from './base'

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

export type SkyLayers =
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
