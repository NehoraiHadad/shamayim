import { DOT_R } from '../../ui/scene/marks/sceneLayout'
import { givesWay, underSettlementLabel, type House, type SettlementInput } from '../landmarks/settlement'

export type CityZones = Pick<SettlementInput, 'centerX' | 'centerY' | 'width' | 'keepOut' | 'absorbed'> & {
  floor: number
}

export function cityHouseFits(house: House, input: CityZones) {
  const { x, w, h, baseY, row } = house
  const { width, centerX, centerY, floor, keepOut, absorbed } = input
  const left = x - w / 2, right = x + w / 2
  const roof = baseY - h - 1.8
  const corner = left < 110 * width / 375 || right > 265 * width / 375
  if (roof < (corner ? 22 : 4) || baseY > floor) return false
  const dx = Math.max(left - centerX, centerX - right, 0)
  const dy = Math.max(roof - centerY, centerY - baseY, 0)
  if (row !== 0 && Math.hypot(dx, dy) < DOT_R + 1.5) return false
  if (row === 2 && underSettlementLabel(centerX, left, right)) return false
  if (keepOut?.some(box => right > box.left - 2 && left < box.right + 2 &&
    baseY > box.top - 2 && roof < box.bottom + 2)) return false
  return !givesWay(house, absorbed)
}
