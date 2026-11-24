import { useId, type CSSProperties } from 'react'
import { SCENE_H } from '../../../world/sceneBox'
import type { CaptionItem } from '../../model/captionItem'
import type { SceneStyle } from '../../paint/painters'
import { CAPTION_HANDS, type CaptionHand } from './hands'
import { CaptionMark, SpotDot } from './marks'

const cover: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }
/** Px at each end over which a line along the ground fades out. */
const FADE = 14
/** Px from the lettering's foot to its baseline. */
const BASE = 1

/** A rule in the hand's strokes over a halo of its own. */
function Rule({ points, hand, ink, halo }: { points: readonly (readonly [number, number])[]; hand: CaptionHand; ink: string; halo: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={hand.rule[0].path(points)} stroke={halo} strokeWidth={3} strokeOpacity={.4} />
      {hand.rule.map((stroke, i) => <path key={i} d={stroke.path(points)} stroke={ink} strokeWidth={stroke.width} strokeOpacity={stroke.alpha} />)}
    </g>
  )
}

/** The place's height as one thing with the place (a design option), from the model's facts, in the given hand. */
export function CaptionOverlay({ item, width, style, hand: id }: { item: CaptionItem; width: number; style?: CSSProperties; hand: SceneStyle }) {
  const hand = CAPTION_HANDS[id], { tone, ground, spot, tick, line } = item
  const fade = useId()
  const middle = item.y + item.h / 2, baseline = middle + 5 - BASE
  const ends = line && [line[0][0], line[line.length - 1][0]]
  const shift = item.markDx === null ? 0 : -Math.sign(item.markDx) * (item.w / 2 - Math.abs(item.markDx) + 2)
  return (
    <svg viewBox={`0 0 ${width} ${SCENE_H}`} preserveAspectRatio="none" style={{ ...cover, ...style }} aria-hidden="true">
      {line && ends && (
        <>
          <defs>
            <linearGradient id={`${fade}g`} gradientUnits="userSpaceOnUse" x1={ends[0]} x2={ends[1]} y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset={FADE / (ends[1] - ends[0])} stopColor="#fff" />
              <stop offset={1 - FADE / (ends[1] - ends[0])} stopColor="#fff" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id={`${fade}m`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={SCENE_H}>
              <rect width={width} height={SCENE_H} fill={`url(#${fade}g)`} />
            </mask>
          </defs>
          <g mask={`url(#${fade}m)`}><Rule points={line} hand={hand} ink={ground.ink} halo={ground.halo} /></g>
        </>
      )}
      {tick && <Rule points={[[spot.x, tick.top], [spot.x, tick.bottom]]} hand={hand} ink={line ? ground.ink : tone.ink} halo={line ? ground.halo : tone.halo} />}
      <SpotDot x={spot.x} y={spot.y} fill={item.accent} ring={ground.halo} hand={id} />
      <g transform={`rotate(${(item.slope * 180 / Math.PI).toFixed(2)} ${item.x} ${middle})`}>
        {item.markDx !== null && <CaptionMark x={item.x + item.markDx} y={middle} ink={tone.ink} halo={tone.halo} hand={id} />}
        <text x={item.x + shift} y={baseline} textAnchor="middle" direction="rtl" fill={tone.ink} stroke={tone.halo}
          strokeWidth={hand.halo} strokeOpacity={hand.haloAlpha} strokeLinejoin="round" paintOrder="stroke"
          style={{ fontFamily: hand.font, fontSize: hand.size, fontWeight: hand.weight }}>{item.text}</text>
      </g>
    </svg>
  )
}
