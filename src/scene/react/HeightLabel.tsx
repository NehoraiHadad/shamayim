import type { CSSProperties } from 'react'
import { LETTER_H } from '../../world/layout'
import { SCENE_H } from '../../world/sceneBox'
import type { OverlayItem } from '../model/types'
import type { SceneStyle } from '../paint/painters'
import { HEIGHT_HANDS } from './heightHands'

/** The letters' halo: a close ring that carries the contrast, and a soft fall-off round it (px). */
const HALO = { ring: 2.4, soft: 4.4, blur: 1.1 }

/** The letters' baseline under their top (px): Hebrew and figures stand on it. */
const BASE = LETTER_H - .4

const frame: CSSProperties = { position: 'absolute', top: 0, width: 1, height: SCENE_H, overflow: 'visible', pointerEvents: 'none' }

/**
 * The place's height lettered over its roofs, with its tick and the small dot on its exact spot: one thing on one plumb
 * line, so it is drawn round the spot's column at its own size and only the column moves with the figure.
 */
export function HeightLabel({ item, left, style, hand: id }: { item: Extract<OverlayItem, { kind: 'height' }>; left: string; style?: CSSProperties; hand: SceneStyle }) {
  const hand = HEIGHT_HANDS[id], { spot, tick, tone } = item
  const letters = { x: item.x - spot.x, y: item.y + BASE, textAnchor: 'middle' as const, direction: 'rtl' as const, stroke: tone.halo,
    strokeLinejoin: 'round' as const, fontFamily: hand.font, fontSize: hand.size, fontWeight: hand.weight }
  const line = hand.tick(tick.top, tick.bottom)
  return (
    <svg style={{ ...frame, left, ...style }} aria-hidden="true">
      <g fill="none" strokeLinecap="round">
        <path d={line} stroke={tone.halo} strokeWidth={3} strokeOpacity={.55} />
        {hand.strokes.map(({ dx, width, alpha }) => <path key={dx} d={line} transform={`translate(${dx})`} stroke={tone.ink} strokeWidth={width} strokeOpacity={alpha} />)}
      </g>
      <path d={hand.dot(spot.y)} fill={item.fill} stroke={item.rim} strokeWidth={1.3} strokeLinejoin="round" />
      <text {...letters} fill={tone.halo} strokeWidth={HALO.soft} style={{ filter: `blur(${HALO.blur}px)` }}>{item.text}</text>
      <text {...letters} fill={tone.ink} strokeWidth={HALO.ring} paintOrder="stroke">{item.text}</text>
    </svg>
  )
}
