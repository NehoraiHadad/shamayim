import { captionTone } from '../../theme/captionTone'
import { JOIN } from '../../world/caption/inscription'
import type { Caption } from '../../world/caption/types'
import { SCENE_W } from '../../world/sceneBox'
import type { WorldState } from '../../world/types'
import type { OverlayItem } from './types'

export type CaptionItem = Extract<OverlayItem, { kind: 'caption' }>

/** A caption's facts at the figure's width, in the colours of the shown hour. */
export function captionItem(caption: Caption, world: WorldState, width: number): CaptionItem {
  const sx = width / SCENE_W, { palette } = world.light
  return { kind: 'caption', text: caption.name ? caption.name + JOIN + caption.height : caption.height,
    x: caption.x * sx, y: caption.y, w: caption.w, h: caption.h, slope: caption.slope, markDx: caption.markDx,
    spot: { x: caption.spot.x * sx, y: caption.spot.y }, tick: caption.tick,
    line: caption.line && caption.line.map(([x, y]) => [x * sx, y]),
    tone: captionTone(palette, caption.on), ground: captionTone(palette, 'land'), accent: palette.accent }
}
