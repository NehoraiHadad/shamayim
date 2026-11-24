import type { CaptionTone } from '../../../theme/captionTone'
import { MARK_W } from '../../../world/caption/benchmark'
import type { SceneStyle } from '../../paint/painters'
import type { CaptionHand } from './hands'
import { pencilPath } from './strokes'

interface Props { x: number; y: number; hand: SceneStyle }

/** A rule in the hand's strokes over a soft halo of its own. */
export function Rule({ points, hand, tone }: { points: readonly (readonly [number, number])[]; hand: CaptionHand; tone: CaptionTone }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={hand.rule[0].path(points)} stroke={tone.halo} strokeWidth={2.4} strokeOpacity={.3} />
      {hand.rule.map((stroke, i) => <path key={i} d={stroke.path(points)} stroke={tone.ink} strokeWidth={stroke.width} strokeOpacity={stroke.alpha} />)}
    </g>
  )
}

/** The real spot, quiet: a small point of the accent in a fine dark ring. */
export function SpotDot({ x, y, hand, fill, ring }: Props & { fill: string; ring: string }) {
  return hand === 'real'
    ? <circle cx={x} cy={y} r={2} fill={fill} stroke={ring} strokeWidth={1.2} strokeOpacity={.85} />
    : <path d={`M${x - 2.1} ${y + .2}Q${x - 1.9} ${y - 2} ${x + .2} ${y - 2.1}T${x + 2.2} ${y + .3}T${x - .3} ${y + 2.1}T${x - 2.1} ${y + .2}Z`}
        fill={fill} stroke={ring} strokeWidth={1.1} strokeOpacity={.85} strokeLinejoin="round" />
}

/** The survey benchmark as it is cut in stone: a level bar and the three strokes that meet under it. */
export function CaptionMark({ x, y, hand, tone }: Props & { tone: CaptionTone }) {
  const half = MARK_W / 2 - .4, top = y - 3.6, foot = y + 3.8
  const strokes = [[[x - half, top], [x + half, top]], [[x, top + 1], [x - 2.5, foot]], [[x, top + 1], [x, foot]], [[x, top + 1], [x + 2.5, foot]]] as const
  const d = strokes.map(([a, b], i) => hand === 'real' ? `M${a.join(' ')}L${b.join(' ')}` : pencilPath(i)([a, b])).join('')
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={tone.halo} strokeWidth={3} opacity={.7} style={{ filter: 'blur(.8px)' }} />
      <path d={d} stroke={tone.ink} strokeWidth={1.05} />
    </g>
  )
}
