import { useMemo } from 'react'
import type { PlacedTower } from '../../../data/city/cityTowers'
import type { NeighbourMass } from '../../../data/city/neighbours'
import type { Settlement } from '../../../data/landmarks/settlement'
import type { PlacedMark } from '../../../data/landmarks/types'
import { CityMass } from './city/CityMass'
import { CityTowers } from './city/CityTowers'
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
  cityTowers?: readonly PlacedTower[]
  neighbours?: NeighbourMass[]
  width: number
  layer?: 'near' | 'far'
}

const middle = (xs: number[]) => (Math.min(...xs) + Math.max(...xs)) / 2

export function HillMarks({ marks, settlement, cityTowers, neighbours, width, layer = 'near', ...context }: Props) {
  const motion = useMarkMotion()
  const masses = useMemo(() => ([0, 1, 2] as const).flatMap(row => (['flat', 'pitched'] as const).map(roof => {
    const matching = neighbours?.filter(mass => mass.row === row && mass.roof === roof) ?? []
    const houses = matching.flatMap(mass => mass.houses)
    const blocks = new Set(matching.flatMap(mass => mass.blocks ? mass.houses : []))
    return { row, roof, houses, neighbour: { blocks } }
  })), [neighbours])
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
  const massAt = (row: number) => masses.filter(mass => mass.row === row && mass.houses.length).map(mass => {
    const x = middle(mass.houses.map(house => house.x))
    const sunWest = context.sunX == null || context.shaded?.(x) ? null : context.sunX <= x
    return <CityMass key={mass.roof} {...mass} night={night} litShare={context.life.litShare} sunWest={sunWest} />
  })
  return <svg className={`${styles.px} ${far ? styles.farLayer : ''} ${night ? styles.night : ''}`}
    viewBox={`0 0 ${width} 128`} style={lifeStyle(context.life)} data-hidden={motion.hidden || undefined} aria-hidden="true">
    {!far && massAt(0)}
    {(far ? ['line'] : ['behind', 'line']).flatMap(byPlane).map(building)}
    {!far && <>
      {hill.filter(isField).map((mark) => (
        <Field key={mark.id} kind={mark.kind} x={toPx(mark)} ground={context.ground} width={fieldWidth(mark.kind)}
          depth={fieldDepthOf(mark)} />
      ))}
      {byPlane('face').map(building)}
      {massAt(1)}
      {settlement && <SettlementGlyph settlement={settlement} night={context.night} reach={context.reach}
        litShare={context.life.litShare}
        afterRow={cityTowers?.length ? row => <CityTowers towers={cityTowers.filter(tower => tower.row === row)}
          night={night} litShare={context.life.litShare} /> : undefined}
        sunX={context.shaded?.(middle(settlement.houses.map((house) => house.x))) ? null : context.sunX} />}
      {!settlement && cityTowers?.length ? <CityTowers towers={cityTowers} night={night} litShare={context.life.litShare} /> : null}
      {byPlane('inside').map(building)}
      {massAt(2)}
    </>}
  </svg>
}
