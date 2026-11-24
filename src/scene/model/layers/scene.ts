import type { HeightLeader } from '../../../world/heightLabel'
import type { Box } from './base'
import type { CloudLayers } from './cloud'
import type { LandLayers } from './land'
import type { OutsideLayers } from './outside'
import type { SkyLayers } from './sky'
import type { SkyLifeLayers } from './skyLife'
import type { TownLayers } from './town'
import type { WaterLayers } from './water'
import type { WearLayers } from './wear'
import type { WeatherLayers } from './weather'

/** Every layer of the scene, by its `kind`. */
export type LayerDesc =
  | SkyLayers | SkyLifeLayers | CloudLayers | WeatherLayers | LandLayers | WaterLayers | TownLayers | OutsideLayers | WearLayers

export type LayerKind = LayerDesc['kind']
export type LayerOf<K extends LayerKind> = Extract<LayerDesc, { kind: K }>

/** HTML over the land, placed from the model: positions in scene px (x as `box.width` scales it). */
export type OverlayItem =
  /** `x` the label's centre, `y` its top. */
  | { kind: 'height'; text: string; x: number; y: number; below: boolean; backed?: boolean; leader: HeightLeader | null }
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
  /** Text and dot zones (land px) used for scene clearance. */
  clear: Box[]
}
