import type { Cluster } from '../city/clusterTypes'
import type { SettlementStyle } from './settlement'
import { templateDimensions, TWO_STOREY_RISE, type Dimensions } from './settlementPlan'

/** Flat-roof village houses by measured levels: 2 / 3 / 4 storeys, the family house that grows a floor per generation. */
const FLAT_HILL_H: Record<number, number> = { 2: 5.5, 3: 7, 4: 8.5 }

/**
 * House sizes and storeys from what the cluster measured (plan §10.4). Footprints set the size: a village of
 * 220 m² and larger houses draws the 9 × 7 house on every second plot, kibbutz dwellings (60-120 m²) only the 7 × 6.
 * Levels set the storeys: under 1.5 the houses are one storey (1 px lower); above, a share `levels - 1` has two.
 */
export function villageDims(home: Cluster, style: SettlementStyle) {
  const { size } = home.form
  const wide = size >= 4 ? .5 : size === 3 ? 1 / 3 : 0
  const twoStorey = Math.min(1, Math.max(0, home.levels - 1))
  return (row: number, index: number, random: () => number): Dimensions => {
    const shrink = row >= 2 ? .85 : 1
    if (style === 'tile') {
      const big = random() < wide
      const base = big ? { w: 9, h: 7 } : { w: 7, h: 6 }
      if (home.levels < 1.5) return { w: base.w * shrink, h: (base.h - 1) * shrink }
      if (random() < twoStorey) return { w: base.w * shrink, h: (base.h + TWO_STOREY_RISE) * shrink, storeys: 2 }
      return { w: base.w * shrink, h: base.h * shrink }
    }
    if (style === 'flat-hill') {
      const storeys = Math.min(4, Math.max(2, Math.round(home.levels + random() - .5)))
      return { w: (6 + random() * 2) * shrink, h: FLAT_HILL_H[storeys] * shrink }
    }
    return templateDimensions(style, row, index, random)
  }
}

/** Long low farm buildings: four at most, one per big-roof share of a quarter (Nahalal's ring, a kibbutz yard). */
export function shedCount(home: Cluster) { return Math.min(4, Math.max(0, Math.round(4 * home.form.big))) }
