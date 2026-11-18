import type { SettlementInput, SettlementSize, SettlementStyle } from './settlement'

const ROWS: Record<SettlementSize, number[]> = { small: [5, 4, 3], medium: [8, 7, 5], large: [10, 9, 7] }
const HALF: Record<SettlementSize, number> = { small: 27, medium: 43, large: 62 }
export const PITCH: Record<SettlementStyle, number> = { tile: 9, 'flat-hill': 7, 'flat-desert': 7, blocks: 6.5 }
export const ROW_STEP: Record<SettlementStyle, number> = { tile: 5.5, 'flat-hill': 4, 'flat-desert': 6, blocks: 4.5 }
export const LABEL_MAX = 116

export type RowPlan = {
  row: number
  // Template offsets consume the same stream as the preceding row's houses.
  centers: (random: () => number) => number[]
  // How far below the crest the row's terrace stands, in px.
  sink: number
  // Footprint rows follow the mapped houses further up and down the slope than the template's REACH.
  reach?: number
  // Farm sheds from the mapped big roofs (V4); houses of the same row keep clear of them.
  kind?: 'shed'
  // House sizes and storeys from the mapped cluster; the template's when absent.
  dims?: (row: number, index: number, random: () => number) => Dimensions
}

export type Dimensions = { w: number; h: number; storeys?: 2 }
/** A second storey raises a tile house's walls by 2.5 px. */
export const TWO_STOREY_RISE = 2.5

/** Chicken house, cowshed, packing house: 11-14 px long, 3.5-4.5 px to the ridge (plan §10.4). */
export function shedDimensions(random: () => number): Dimensions { return { w: 11 + random() * 3, h: 3.5 + random() } }

export function templateHalf(size: SettlementSize) { return HALF[size] }

function offsets(count: number, row: number, pitch: number, random: () => number) {
  if (row === 0) {
    return Array.from({ length: count }, (_, i) => (i % 2 ? 1 : -1) * (6 + 4.5 + Math.floor(i / 2) * pitch)
      + (random() - .5) * 3)
  }
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * pitch + (random() - .5) * 2)
}

export function templateRows({ style, size, centerX, centerY, width, ground }: SettlementInput): RowPlan[] {
  const extra = Math.max(0, Math.floor((width - 375) / 120))
  const step = ROW_STEP[style]
  const fall = ground(centerX + 8) - ground(centerX - 8)
  const steep = Math.abs(fall) / 16 > .6
  const pitch = PITCH[style] * (steep ? .6 : 1)
  const lean = steep ? -Math.sign(fall) * pitch * 3 : 0
  const counts = style === 'blocks' ? [...ROWS[size], ROWS[size][2] - 1] : ROWS[size]
  let rows = counts.map(count => count + extra)
  while (rows.length > 1 && centerY + 7 + step * (rows.length - 1) + 2 > LABEL_MAX) rows = rows.slice(0, -1)
  return rows.map((count, row) => ({
    row, sink: row * step,
    centers: random => offsets(count, row, pitch, random).map(offset => centerX + offset + (row ? lean : 0)),
  }))
}

// Block glyphs draw one window row per storey.
export const STOREY = 2.8
export const PARAPET = 1.5

export function templateDimensions(style: SettlementStyle, row: number, index: number, random: () => number): Dimensions {
  const shrink = row >= 2 ? .85 : 1
  if (style === 'tile') return index % 3 === 2 ? { w: 9 * shrink, h: 7 * shrink } : { w: 7 * shrink, h: 6 * shrink }
  if (style === 'blocks') {
    /** Two to four storeys, the odd five; widths from a narrow stair-house to a wide family block. */
    const roll = random()
    const storeys = roll < .35 ? 2 : roll < .8 ? 3 : roll < .97 ? 4 : 5
    const fewer = row >= 2 && storeys > 2 ? 1 : 0
    return { w: 5 + random() * 6, h: PARAPET + (storeys - fewer) * STOREY }
  }
  return { w: (6 + random() * 2) * shrink, h: (5 + random() * 3) * shrink }
}
