import { useId } from 'react'
import type { Settlement } from '../../../data/landmarks/settlement'
import { seat } from '../../../data/landmarks/seat'
import type { PlacedMark } from '../../../data/landmarks/types'
import { BUILDINGS, FIELD_KINDS, fieldWidth } from './generic/buildingSpecs'
import { Field } from './generic/fields'
import { isHillMark, planeOf } from './hillPlane'
import { SettlementGlyph } from './SettlementGlyph'
import styles from './marks.module.css'

/**
 * Generic marks and the place's own houses in one px-space svg, so nothing stretches and every base can be seated on
 * the real slope, toned by depth and lit from the sun side (docs/design/ILLUSTRATION.md §2).
 */
interface Props {
  marks: PlacedMark[]
  settlement: Settlement | null
  width: number
  ground: (x: number) => number
  /** Sun position in px, or null when there is no sun-side light (night, overcast, heavy haze). */
  sunX: number | null
  night: boolean
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

function Building({ mark, x, ground, sunX, night }: { mark: PlacedMark; x: number } & Omit<Props, 'marks' | 'settlement' | 'width'>) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const spec = BUILDINGS[mark.kind]!
  const plane = planeOf(mark)
  const depth = clamp(Math.abs(mark.dy) / 1.5)
  const h = spec.h(mark.hPx)
  const scale = plane === 'behind' ? 1 - .2 * depth : 1
  const seated = seat(ground, x, spec.w * scale)
  if (!seated) return null
  const base = plane === 'face' ? ground(x) + 3 + 9 * depth
    : seated.baseY + (plane === 'behind' ? .25 * depth * h * scale : 0)
  const side = night || plane === 'behind' || sunX == null ? null
    : sunX < x - 40 ? 'w' : sunX > x + 40 ? 'e' : 'top'
  const half = spec.w / 2
  const glyph = <spec.Draw h={h} night={night} />
  return <g transform={`translate(${x.toFixed(1)} ${base.toFixed(1)}) scale(${scale})`}
    className={plane === 'behind' ? styles.back : undefined}>
    {plane === 'face' && !night && <rect className={styles.shade} x={side === 'w' ? -half : -half - 1} y={0}
      width={spec.w + 1} height={1} />}
    {glyph}
    {side && <>
      <mask id={id} maskUnits="userSpaceOnUse" x={-half - 1} y={-h - 1} width={spec.w + 2} height={h + 2}>
        <g className={styles.maskWhite}><spec.Draw h={h} night={false} /></g>
      </mask>
      <rect className={styles.lit} mask={`url(#${id})`} x={side === 'w' ? -half : side === 'e' ? half * .3 : -half}
        y={-h} width={side === 'top' ? spec.w : spec.w * .35} height={side === 'top' ? 1.5 : h} />
    </>}
  </g>
}

export function HillMarks({ marks, settlement, width, ground, sunX, night }: Props) {
  const hill = marks.filter(isHillMark)
  const toPx = (mark: PlacedMark) => mark.xPct / 100 * width
  const byPlane = (plane: string) => hill.filter((mark) => planeOf(mark) === plane && !FIELD_KINDS.has(mark.kind))
  return <svg className={`${styles.px} ${night ? styles.night : ''}`} viewBox={`0 0 ${width} 128`} aria-hidden="true">
    {(['behind', 'line'] as const).flatMap((plane) => byPlane(plane)).map((mark) => (
      <Building key={mark.id} mark={mark} x={toPx(mark)} ground={ground} sunX={sunX} night={night} />
    ))}
    {hill.filter((mark) => FIELD_KINDS.has(mark.kind)).map((mark) => (
      <Field key={mark.id} kind={mark.kind} x={toPx(mark)} ground={ground} width={fieldWidth(mark.kind)}
        depth={3 + 9 * Math.max(.3, clamp(Math.abs(mark.dy) / 1.5))} />
    ))}
    {byPlane('face').map((mark) => (
      <Building key={mark.id} mark={mark} x={toPx(mark)} ground={ground} sunX={sunX} night={night} />
    ))}
    {settlement && <SettlementGlyph settlement={settlement} sunX={sunX} night={night} />}
  </svg>
}
