import type { Settlement } from '../../../data/landmarks/settlement'
import type { PlacedMark } from '../../../data/landmarks/types'
import { fieldWidth } from './generic/buildingSpecs'
import { Field } from './generic/fields'
import { isField, isHillMark, planeOf, specOf } from './hillPlane'
import { fieldDepthOf } from './markBox'
import { MarkBuilding, type BuildingContext } from './MarkBuilding'
import { SettlementGlyph } from './SettlementGlyph'
import { lifeStyle, useMarkMotion } from './useMarkMotion'
import styles from './marks.module.css'

/**
 * Marks and the place's own houses in one px-space svg, so nothing stretches and every base can be seated on
 * the real slope, toned by depth and lit from the sun side (docs/design/ILLUSTRATION.md §2). `layer="far"` draws the
 * far-ridge marks as silhouettes between the two ridge paths.
 */
interface Props extends Omit<BuildingContext, 'motion' | 'far'> {
  marks: PlacedMark[]
  settlement: Settlement | null
  width: number
  layer?: 'near' | 'far'
}

export function HillMarks({ marks, settlement, width, layer = 'near', ...context }: Props) {
  const motion = useMarkMotion()
  if (layer === 'far' && context.life.hideFar) return null
  const far = layer === 'far'
  const shared = { ...context, motion: motion.allowed, far }
  const toPx = (mark: PlacedMark) => mark.xPct / 100 * width
  const hill = far ? marks.filter((mark) => mark.layer === 'far' && specOf(mark)) : marks.filter(isHillMark)
  /** The place's own mosque or tower stands inside its cluster: drawn after the houses, in the gap they leave it. */
  const byPlane = (plane: string) => hill.filter((mark) => !isField(mark)
    && (far || (planeOf(mark) === plane && !mark.absorbed) || (plane === 'inside' && mark.absorbed)))
  const building = (mark: PlacedMark) => (
    <MarkBuilding key={`${mark.id}-${motion.generation}`} mark={mark} x={toPx(mark)} {...shared} />
  )
  const night = context.night && !far
  return <svg className={`${styles.px} ${far ? styles.farLayer : ''} ${night ? styles.night : ''}`}
    viewBox={`0 0 ${width} 128`} style={lifeStyle(context.life)} data-hidden={motion.hidden || undefined} aria-hidden="true">
    {(far ? ['line'] : ['behind', 'line']).flatMap(byPlane).map(building)}
    {!far && <>
      {hill.filter(isField).map((mark) => (
        <Field key={mark.id} kind={mark.kind} x={toPx(mark)} ground={context.ground} width={fieldWidth(mark.kind)}
          depth={fieldDepthOf(mark)} />
      ))}
      {byPlane('face').map(building)}
      {settlement && <SettlementGlyph settlement={settlement} sunX={context.sunX} night={context.night} />}
      {byPlane('inside').map(building)}
    </>}
  </svg>
}
