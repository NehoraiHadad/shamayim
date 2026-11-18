import { DOT_R } from '../../ui/scene/marks/sceneLayout'
import { givesWay, underSettlementLabel, type House, type SettlementInput } from '../landmarks/settlement'

export type CityZones = Pick<SettlementInput, 'centerX' | 'centerY' | 'width' | 'keepOut' | 'absorbed'> & {
  floor: number
}

export function cityHouseFits(house: House, input: CityZones) {
  const { left, right } = cityBox(house, 1.8)
  return cityBuildingFits(house, input, 1.8) &&
    (house.row !== 2 || !underSettlementLabel(input.centerX, left, right)) && !givesWay(house, input.absorbed)
}

type Building = Pick<House, 'x' | 'w' | 'h' | 'baseY' | 'row'>

export function cityBox({ x, w, h, baseY }: Building, roofExtra = 0) {
  return { left: x - w / 2, right: x + w / 2, top: baseY - h - roofExtra, bottom: baseY }
}

export function cityBuildingFits(building: Building, input: CityZones, roofExtra = 0) {
  const { width, centerX, centerY, floor, keepOut } = input
  const { left, right, top: roof, bottom: baseY } = cityBox(building, roofExtra)
  const corner = left < 110 * width / 375 || right > 265 * width / 375
  if (roof < (corner ? 22 : 4) || baseY > floor) return false
  const dx = Math.max(left - centerX, centerX - right, 0)
  const dy = Math.max(roof - centerY, centerY - baseY, 0)
  if (building.row !== 0 && Math.hypot(dx, dy) < DOT_R + 1.5) return false
  if (keepOut?.some(box => right > box.left - 2 && left < box.right + 2 &&
    baseY > box.top - 2 && roof < box.bottom + 2)) return false
  return true
}
