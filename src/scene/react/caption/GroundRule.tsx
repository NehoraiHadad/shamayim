import type { CaptionTone } from '../../../theme/captionTone'
import { SCENE_H } from '../../../world/sceneBox'
import type { CaptionItem } from '../../model/captionItem'
import type { CaptionHand } from './hands'
import { Rule } from './marks'

/** Px over which the line fades out at its ends. */
const FADE = 22

/** The line along the place's feet, open where the height stands in it, fading out at both ends. */
export function GroundRule({ id, line, gap, hand, tone, width }: { id: string; line: NonNullable<CaptionItem['line']>; gap: [number, number]
  hand: CaptionHand; tone: CaptionTone; width: number }) {
  const x1 = line[0][0], x2 = line[line.length - 1][0], share = Math.min(.5, FADE / (x2 - x1))
  const parts = [line.filter(([x]) => x < gap[0]), line.filter(([x]) => x > gap[1])].filter(part => part.length > 1)
  return (
    <>
      <defs>
        <linearGradient id={`${id}g`} gradientUnits="userSpaceOnUse" x1={x1} x2={x2} y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset={share} stopColor="#fff" />
          <stop offset={1 - share} stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={SCENE_H}>
          <rect width={width} height={SCENE_H} fill={`url(#${id}g)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}m)`}>{parts.map((part, i) => <Rule key={i} points={part} hand={hand} tone={tone} />)}</g>
    </>
  )
}
