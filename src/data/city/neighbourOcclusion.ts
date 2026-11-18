import type { House } from '../landmarks/settlement'
import type { Extent } from './clusterTypes'
import type { NeighbourMass } from './neighbours'
import { mergeRuns } from './runs'

export const roofExtra = (roof: NeighbourMass['roof']) => roof === 'flat' ? .6 : 0
type Silhouette = { house: House; gable: boolean; extra: number }

function covers(rear: Silhouette, front: Silhouette): Extent[] {
  const a = rear.house, b = front.house
  const left = Math.max(a.x - a.w / 2, b.x - b.w / 2)
  const right = Math.min(a.x + a.w / 2, b.x + b.w / 2)
  if (right <= left || b.baseY < a.baseY) return []
  const cuts = [left, right, ...[a.x, b.x].filter(x => x > left && x < right)].sort((x, y) => x - y)
  const top = ({ house, gable, extra }: Silhouette, x: number) => house.baseY - house.h - extra +
    (gable ? .45 * house.h * Math.abs(x - house.x) / (house.w / 2) : 0)
  const margin = (x: number) => top(rear, x) + 1.5 - top(front, x)
  return cuts.slice(1).flatMap((end, i): Extent[] => {
    const start = cuts[i]
    const first = margin(start), last = margin(end)
    if (first >= 0 && last >= 0 && first + last > 0) return [[start, end]]
    if (first <= 0 && last <= 0) return []
    // Between eaves and ridges the roof lines are straight, so their visibility threshold has one crossing.
    const crossing = start + (end - start) * first / (first - last)
    return first > 0 ? [[start, crossing]] : [[crossing, end]]
  })
}

export function visibleNeighbours(masses: NeighbourMass[], homeHouses: House[]) {
  const silhouette = (mass: NeighbourMass, house: House): Silhouette =>
    ({ house, gable: mass.roof === 'pitched', extra: roofExtra(mass.roof) })
  const home = homeHouses.map(house => ({ house, gable: false, extra: 1.8 }))
  const kept = new Map<NeighbourMass, House[]>()
  const front: Silhouette[] = []
  for (const row of [2, 1, 0]) {
    if (row === 1) front.push(...home)
    const sameRow: Silhouette[] = []
    for (const mass of masses.filter(m => m.row === row)) {
      const houses = mass.houses.filter(house => {
        const shape = silhouette(mass, house)
        const covered = mergeRuns(front.flatMap(other => covers(shape, other)))
        return !covered.some(([a, b]) => a <= house.x - house.w / 2 && b >= house.x + house.w / 2)
      })
      kept.set(mass, houses)
      sameRow.push(...houses.map(house => silhouette(mass, house)))
    }
    front.push(...sameRow)
  }
  return masses.flatMap(mass => {
    const houses = kept.get(mass) ?? []
    return houses.length ? [{ ...mass, houses }] : []
  })
}
