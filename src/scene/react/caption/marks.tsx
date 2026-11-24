import { MARK_W } from '../../../world/caption/benchmark'
import type { SceneStyle } from '../../paint/painters'
import { pencilPath } from './strokes'

interface Props { x: number; y: number; hand: SceneStyle }

/** The real spot, quiet: a small point of the accent in a fine dark ring. */
export function SpotDot({ x, y, hand, fill, ring }: Props & { fill: string; ring: string }) {
  return hand === 'real'
    ? <circle cx={x} cy={y} r={2} fill={fill} stroke={ring} strokeWidth={1.2} strokeOpacity={.85} />
    : <path d={`M${x - 2.1} ${y + .2}Q${x - 1.9} ${y - 2} ${x + .2} ${y - 2.1}T${x + 2.2} ${y + .3}T${x - .3} ${y + 2.1}T${x - 2.1} ${y + .2}Z`}
        fill={fill} stroke={ring} strokeWidth={1.1} strokeOpacity={.85} strokeLinejoin="round" />
}

/** The survey benchmark: a small triangle on the ground round its point. */
export function CaptionMark({ x, y, hand, ink, halo }: Props & { ink: string; halo: string }) {
  const w = MARK_W / 2 - .5, top = y - 4, foot = y + 3.6
  const corners = [[x - w, foot], [x, top], [x + w, foot], [x - w, foot]] as const
  const ruled = `M${corners.map(c => c.join(' ')).join('L')}Z`
  return (
    <g fill="none" strokeLinejoin="round" strokeLinecap="round">
      <path d={ruled} stroke={halo} strokeWidth={3} strokeOpacity={.72} fill={halo} fillOpacity={.35} />
      {hand === 'real' ? <path d={ruled} stroke={ink} strokeWidth={1.1} />
        : corners.slice(1).map((c, i) => <path key={i} d={pencilPath(i)([corners[i], c])} stroke={ink} strokeWidth={1.1} />)}
      <circle cx={x} cy={foot - 2.4} r={.9} fill={ink} />
    </g>
  )
}
