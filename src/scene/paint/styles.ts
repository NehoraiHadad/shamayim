import type { LayerDesc } from '../model/types'
import type { PaintedKind, Painter, Style } from './contract'
import { DRAWN } from './drawn'
import { REAL } from './real'

/** The scene's styles: one world, one model, several hands. A style is its folder and its line here. */
export const STYLES = { real: REAL, drawn: DRAWN } satisfies Record<string, Style>

export type SceneStyle = keyof typeof STYLES
export const SCENE_STYLES = Object.keys(STYLES) as readonly SceneStyle[]
export const DEFAULT_STYLE: SceneStyle = 'real'

export const isSceneStyle = (value: unknown): value is SceneStyle => SCENE_STYLES.includes(value as SceneStyle)

/** A style's painter of a layer (none for the contrails, which the surface lays itself). */
export function painterOf(desc: LayerDesc, style: SceneStyle = DEFAULT_STYLE): Painter | undefined {
  return STYLES[style].painters[desc.kind as PaintedKind] as Painter | undefined
}

/** What a layer's keys carry of the style: nothing where it has the default's painter, so a switch repaints only what differs. */
export const styleKey = (desc: LayerDesc, style: SceneStyle) => (painterOf(desc, style) === painterOf(desc) ? '' : `~${style}`)
