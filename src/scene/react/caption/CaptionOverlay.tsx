import { useId, type CSSProperties } from 'react'
import { SCENE_H } from '../../../world/sceneBox'
import type { CaptionItem } from '../../model/captionItem'
import type { SceneStyle } from '../../paint/painters'
import { GroundRule } from './GroundRule'
import { CAPTION_HANDS } from './hands'
import { CaptionMark, Rule, SpotDot } from './marks'

const cover: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }
/** Px from the middle of the lettering to its baseline. */
const BASE = 4.1

/** The place's height as one thing with the place (a design option), from the model's facts, in the given hand. */
export function CaptionOverlay({ item, width, style, hand: id }: { item: CaptionItem; width: number; style?: CSSProperties; hand: SceneStyle }) {
  const hand = CAPTION_HANDS[id], { tone, ground, spot, tick, line } = item
  const key = useId()
  const middle = item.y + item.h / 2
  // The lettering is centred in what the mark leaves it of the box.
  const shift = item.markDx === null ? 0 : -Math.sign(item.markDx) * (item.w / 2 - Math.abs(item.markDx) + 2)
  const text = { x: item.x + shift, y: middle + BASE, textAnchor: 'middle' as const, direction: 'rtl' as const,
    style: { fontFamily: hand.font, fontSize: hand.size, fontWeight: hand.weight } }
  return (
    <svg viewBox={`0 0 ${width} ${SCENE_H}`} preserveAspectRatio="none" style={{ ...cover, ...style }} aria-hidden="true">
      {line && <GroundRule id={key} line={line} gap={[item.x - item.w / 2, item.x + item.w / 2]} hand={hand} tone={ground} width={width} />}
      {tick && <Rule points={[[spot.x, tick.top], [spot.x, tick.bottom]]} hand={hand} tone={tone} />}
      <SpotDot x={spot.x} y={spot.y} fill={item.accent} ring={ground.halo} hand={id} />
      <g transform={`rotate(${(item.slope * 180 / Math.PI).toFixed(2)} ${item.x} ${middle})`}>
        {item.markDx !== null && <CaptionMark x={item.x + item.markDx} y={middle} hand={id} tone={tone} />}
        <text {...text} fill={tone.halo} stroke={tone.halo} strokeWidth={hand.halo.width} opacity={hand.halo.alpha} strokeLinejoin="round"
          style={{ ...text.style, filter: `blur(${hand.halo.blur}px)` }}>{item.text}</text>
        <text {...text} fill={tone.ink}>{item.text}</text>
      </g>
    </svg>
  )
}
