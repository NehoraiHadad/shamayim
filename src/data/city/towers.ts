import { NEAR_RADIUS_KM, ridgeX } from '../terrain/ridgeProjection'
import { BAND_WIDTH } from './columns'
import type { CityTower } from './types'

export const towerX = (dx: number, width: number) => ridgeX(dx, NEAR_RADIUS_KM) * width / BAND_WIDTH

const prominence = ({ heightM, dy, name }: CityTower) =>
  heightM * (1 - .15 * Math.min(Math.abs(dy), 5) / 3) + (name ? 10 : 0)

const compareNames = (a = '', b = '') => a < b ? -1 : a > b ? 1 : 0

export function selectTowers(towers: readonly CityTower[], width: number): CityTower[] {
  const ranked = towers.map(tower => ({ tower, x: towerX(tower.dx, width), score: prominence(tower) }))
    .filter(({ x }) => x >= 0 && x <= width)
    .sort((a, b) => b.score - a.score || a.x - b.x || a.tower.dy - b.tower.dy ||
      a.tower.lat - b.tower.lat || a.tower.lon - b.tower.lon || b.tower.heightM - a.tower.heightM ||
      a.tower.wClass - b.tower.wClass || compareNames(a.tower.name, b.tower.name))
  const cap = Math.min(16, 10 + 2 * Math.max(0, Math.floor((width - BAND_WIDTH) / 150)))
  const kept = new Set<typeof ranked[number]>()
  const slots = new Set<number>()
  function keep(candidate: typeof ranked[number], reserve = false) {
    const slot = Math.floor(candidate.x / 12)
    if ((!reserve && slots.has(slot)) || [...kept].some(tower => Math.abs(tower.x - candidate.x) < 5)) return
    kept.add(candidate)
    slots.add(slot)
  }
  // The spacing rule also applies to the local reserve. Try the next local tower if two overlap.
  for (const candidate of ranked) {
    if (kept.size === 2) break
    if (Math.hypot(candidate.tower.dx, candidate.tower.dy) <= 3) keep(candidate, true)
  }
  for (const candidate of ranked) {
    if (kept.size === cap) break
    keep(candidate)
  }
  return ranked.filter(candidate => kept.has(candidate)).map(({ tower }) => tower)
}
