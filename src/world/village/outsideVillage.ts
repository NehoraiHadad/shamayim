import type { FabricCell, OutsideFrame } from '../../data/city/outsideView'
import { seeded } from '../../data/landmarks/hash'
import { HOUSE_ROOF_M } from '../fabricHeight'
import { HOUSE_M } from '../../data/village/cellSource'
import type { SettlementSource } from '../../data/village/settlement'
import { drawnCount } from './count'
import type { DrawnHouse } from './drawn'
import { villageFrame, type VillageFrame } from './frame'
import { housesOfCells } from './fromCells'
import { housesOfFootprints } from './fromFootprints'
import { isVillageSpot, mixed } from './share'
import { standsDry, type WaterAt } from './water'

/** A house of two storeys is drawn this high, share of its width. */
const HIGH = .72
/** A wide building is enlarged less, to this many houses' width, and never below its true size: never a slab. */
const WIDE = 1.6

export interface OutsideVillage extends VillageFrame { source: SettlementSource }

/** The village in a place's outside view, or null where the town's picture is the place's (`villageShare` 0). */
export function outsideVillage(source: SettlementSource | null | undefined, town: OutsideFrame, sceneW: number): OutsideVillage | null {
  if (!source) return null
  const village = villageFrame(source, town, sceneW)
  return village.share > 0 ? { ...village, source } : null
}

const roofOf = (seed: number) => HOUSE_ROOF_M[seeded(seed + 5)() < .6 ? 0 : 1]

/** The houses drawn (and the town's own cells where the place is not all village). */
export function villageCells(village: OutsideVillage, town: readonly FabricCell[], depthPx: number, lat: number, waterAt: WaterAt): FabricCell[] {
  const { source, share, housePx, ppm } = village, enlarge = housePx / (HOUSE_M * ppm)
  const count = share * drawnCount(source.group.houses, village, depthPx)
  const keep = (house: DrawnHouse) => standsDry(house, enlarge, waterAt)
  const houses = source.kind === 'footprints'
    ? housesOfFootprints(source.spots, source.rows, count, house => isVillageSpot(house.seed, share) && !waterAt(house.dx, house.dy)).filter(keep)
    : housesOfCells(source.spots.filter(({ seed }) => isVillageSpot(seed, share)), count, lat, keep)
  const widthM = (frontM: number) => Math.max(frontM, enlarge * Math.min(frontM, WIDE * HOUSE_M))
  return [...town.filter(({ seed }) => !isVillageSpot(seed, share)), ...houses.map(({ dx, dy, seed, frontM }) =>
    ({ dx, dy, seed, wKm: widthM(frontM) / 1000, heightM: roofOf(seed), whole: true as const }))]
}

/** How high a two-storey house of it is drawn (px), `town` being the town's smallest. */
export const villageHouseH = ({ housePx, share }: VillageFrame, town: number) => mixed(town, HIGH * housePx, share)