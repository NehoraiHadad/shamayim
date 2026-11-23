//# allFunctionsCalledOnLoad
import { facadeDetail } from './buildingDetail'
import type { OutsideItem } from './types'

/** Only visible shape bins request shading, with extra roof and accessory work when drawn. */
export function receiversUsed(items: readonly OutsideItem[], tiers: number) {
  const receivers = Array.from({ length: tiers }, () => new Map<number, { detail: boolean; tile: boolean }>())
  const heaters = new Set<number>()
  for (const item of items) {
    if (item.kind !== 'box' && item.kind !== 'tower') continue
    const bins = receivers[item.tier], id = item.receiver
    let needs = bins.get(id)
    if (!needs) bins.set(id, needs = { detail: false, tile: false })
    needs.detail ||= item.kind === 'tower' || facadeDetail(item.w, item.foot - item.top) > 0
    needs.tile ||= item.kind === 'box' && item.roof === 'tile'
    if (item.kind === 'box' && item.heater && item.w > 2.6) heaters.add(item.tier)
  }
  return { receivers, heaters }
}
