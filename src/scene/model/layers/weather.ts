import type { Pt, RGB } from '../../../world/types'
import type { LayerBase } from './base'

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

export type WeatherLayers =
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
