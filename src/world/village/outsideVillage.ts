import type { FabricCell, OutsideFrame } from '../../data/city/outsideView'
import { STOREY_M } from '../../data/city/skylineHeight'
import { seeded } from '../../data/landmarks/hash'
import { HOUSE_M } from '../../data/village/cellSource'
import type { SettlementSource } from '../../data/village/settlement'
import { drawnCount } from './count'
import type { DrawnHouse } from './drawn'
import { depthOf, type DepthRoom } from './depth'
import { villageFrame, type VillageFrame } from './frame'
import { housesOfCells } from './fromCells'
import { housesOfFootprints } from './fromFootprints'
import { isVillageSpot, mixed } from './share'
import { standsDry, type WaterAt } from './water'

/** A house's roof where nothing is known of it: one or two storeys (m). */
export const HOUSE_ROOF_M = [STOREY_M + 1.5, 2 * STOREY_M + 1.5] as const
/** A house of two storeys is drawn this high, share of its width. */
const HIGH = .72

export interface OutsideVillage extends VillageFrame {
  source: SettlementSource
  /** Its spots as built cells, with the town's own cells where the place is not all village. */
  squares: FabricCell[]
}

const roofOf = (seed: number) => HOUSE_ROOF_M[seeded(seed + 5)() < .6 ? 0 : 1]
const cellOf = ({ dx, dy, seed }: DrawnHouse, wKm: number): FabricCell => ({ dx, dy, seed, wKm, heightM: roofOf(seed), whole: true })
const townOf = (cells: readonly FabricCell[], share: number) => cells.filter(({ seed }) => !isVillageSpot(seed, share))

/** The village in a place's outside view, or null where the town's picture is the place's (`villageShare` 0). */
export function outsideVillage(source: SettlementSource | null | undefined, town: OutsideFrame, cells: readonly FabricCell[], sceneW: number): OutsideVillage | null {
  if (!source) return null
  const village = villageFrame(source, town, sceneW)
  if (village.share <= 0) return null
  return { ...village, source, squares: [...townOf(cells, village.share), ...source.spots.map(spot => cellOf({ ...spot, frontM: HOUSE_M }, HOUSE_M / 1000))] }
}

export const villageDepth = ({ frame, widthPx, source, share }: OutsideVillage, room: DepthRoom) =>
  depthOf(frame, widthPx, source.spots, room, share).depthPx

/** The houses drawn (and the town's own cells where the place is not all village). */
export function villageCells(village: OutsideVillage, cells: readonly FabricCell[], depthPx: number, lat: number, waterAt: WaterAt): FabricCell[] {
  const { source, share, housePx, ppm } = village, enlarge = housePx / (HOUSE_M * ppm)
  const count = share * drawnCount(source.group.houses, village, depthPx)
  const keep = (house: DrawnHouse) => standsDry(house, enlarge, waterAt)
  const houses = source.kind === 'footprints'
    ? housesOfFootprints(source.spots, source.rows, count, house => isVillageSpot(house.seed, share) && !waterAt(house.dx, house.dy))
    : housesOfCells(source.spots.filter(({ seed }) => isVillageSpot(seed, share)), count, lat, keep)
  return [...townOf(cells, share), ...houses.filter(keep).map(house => cellOf(house, house.frontM * enlarge / 1000))]
}

/** How high a two-storey house of it is drawn (px), `town` being the town's smallest. */
export const villageHouseH = ({ housePx, share }: VillageFrame, town: number) => mixed(town, HIGH * housePx, share)