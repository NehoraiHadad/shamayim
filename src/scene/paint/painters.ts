import type { LayerDesc } from '../model/types'
import type { PaintedKind, Painter, Painters } from './contract'
import { DRAWN_PAINTERS } from './drawn/painters'
import { REAL_PAINTERS } from './real/painters'

/**
 * The scene's styles by id, and each one's painters: what paints, without what lights (`styles.ts` adds it), so the paint
 * worker loads no model light. A style is its folder, its lines here and its lines in `styles.ts`.
 */
export const PAINTERS = {
  real: REAL_PAINTERS,
  drawn: DRAWN_PAINTERS,
} satisfies Record<string, Painters>

export type SceneStyle = keyof typeof PAINTERS
export const SCENE_STYLES = Object.keys(PAINTERS) as readonly SceneStyle[]
export const DEFAULT_STYLE: SceneStyle = 'real'

export const isSceneStyle = (value: unknown): value is SceneStyle => SCENE_STYLES.includes(value as SceneStyle)

/** A style's painter of a layer (none for the contrails, which the surface lays itself). */
export function painterOf(desc: LayerDesc, style: SceneStyle = DEFAULT_STYLE): Painter | undefined {
  return PAINTERS[style][desc.kind as PaintedKind] as Painter | undefined
}

/** What a layer's keys carry of the style: nothing where it has the default's painter, so a switch repaints only what differs. */
export const styleKey = (desc: LayerDesc, style: SceneStyle) => (painterOf(desc, style) === painterOf(desc) ? '' : `~${style}`)
