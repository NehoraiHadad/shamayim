import { outsideProject, type FabricCell, type Ground, type OutsideFrame, type PlaceLie } from '../../data/city/outsideView'
import type { SettlementSource } from '../../data/village/settlement'
import { depthOf, dotYOf, feetOf, footsOf, type DepthRoom } from './depth'
import { outsideVillage, villageCells, type OutsideVillage } from './outsideVillage'
import { mixed } from './share'
import type { WaterAt } from './water'

/** The town's picture a village is laid on: its frame, its cells, its one vertical scale and the land as drawn. */
export interface TownLie {
  lat: number; width: number; floor: number
  frame: OutsideFrame; lie: PlaceLie; cells: FabricCell[]
  ground: Ground
  vscale: { s: number; dotY: number; h0: number } | null
  heightNear: ((dx: number, dy: number) => number | null) | undefined
  waterAt: WaterAt
  /** Whether a spot of the screen is the water drawn. */
  onWater: (x: number, y: number) => boolean
}
export interface VillageLie { village: OutsideVillage; frame: OutsideFrame; lie: PlaceLie; cells: FabricCell[]; dotY: number; levelY: (h: number) => number }

/** The dot stands this far (px) over the base its row stands on (`vscale.dotY`). */
const DOT_PX = 1
/** The feet stand at least this far under the land's line (px). */
const UNDER_PX = 1.5

/**
 * The village laid on the land the town's picture has: on its own frame (its houses larger and its rows deeper than a
 * town's), every foot between the land's line and the sheet, so the land round it is never raised for it. Null where the
 * place is no village, or its ground is unknown.
 */
export function layVillage(source: SettlementSource | null | undefined, town: TownLie): VillageLie | null {
  const { vscale, heightNear, ground, floor } = town
  const village = vscale && heightNear ? outsideVillage(source, town.frame, town.width) : null
  if (!village || !vscale || !heightNear) return null
  const { frame, share, source: { spots } } = village, { s, h0 } = vscale
  const room: DepthRoom = { top: x => ground(x) + UNDER_PX, floor, lift: (dx, dy) => (h0 - (heightNear(dx, dy) ?? h0)) * s }
  const feet = feetOf(frame, spots, room), { depthPx } = depthOf(feet, village.widthPx, floor, share)
  const townY = vscale.dotY + DOT_PX
  const dotY = mixed(townY, dotYOf(feet, depthPx, townY, floor), share)
  const baseY = footsOf(frame, depthPx, dotY, room, share)
  const dry = ({ dx, dy, wKm }: FabricCell) => {
    const { x, depth } = outsideProject(frame, dx, dy), half = wKm * frame.f / depth / 2, y = baseY(dx, dy)
    return !town.onWater(x - half, y) && !town.onWater(x + half, y)
  }
  return { village, frame, lie: { ...town.lie, baseY }, dotY: dotY - DOT_PX, levelY: h => Math.min(floor, dotY + (h0 - h) * s),
    cells: villageCells(village, town.cells, depthPx, town.lat, town.waterAt).filter(dry) }
}