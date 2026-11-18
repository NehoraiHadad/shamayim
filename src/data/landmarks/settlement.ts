import type { Place } from '../../config/place'
import { offsetKm } from './project'
import { seeded } from './hash'
import { seat } from './seat'
import { terraceLine } from './terraces'
import type { Landmark } from './types'

/** The place's own houses, composed as one cluster draped over the crest (docs/design/ILLUSTRATION.md §4). */
export type SettlementStyle = 'tile' | 'flat-hill' | 'flat-desert' | 'blocks'
export type SettlementSize = 'small' | 'medium' | 'large'

export interface House { x: number; baseY: number; w: number; h: number; row: number; lit: boolean; seed: number }
export interface Settlement {
  style: SettlementStyle
  houses: House[]
  /** Terrace lines between face rows, as SVG path data in px. */
  contours: string[]
  /** Top of the elevation label: just under the houses that stand above it. */
  labelTop: number
  halfWidth: number
}

const ROWS: Record<SettlementSize, number[]> = { small: [5, 4, 3], medium: [8, 7, 5], large: [10, 9, 7] }
const HALF: Record<SettlementSize, number> = { small: 27, medium: 43, large: 62 }
const PITCH: Record<SettlementStyle, number> = { tile: 9, 'flat-hill': 7, 'flat-desert': 7, blocks: 6.5 }
const ROW_STEP: Record<SettlementStyle, number> = { tile: 5.5, 'flat-hill': 4, 'flat-desert': 6, blocks: 4.5 }
/**
 * How far a house's ground may rise above / fall below the dot (px): houses spread along the contour near the crest
 * instead of running down a steep face in a staircase. Desert towns stay on the plateau rim.
 */
const REACH: Record<SettlementStyle, { up: number; down: number }> = { tile: { up: 14, down: 12 },
  'flat-hill': { up: 14, down: 12 }, 'flat-desert': { up: 5, down: 5 }, blocks: { up: 40, down: 24 } }
const DOT_R = 5.5
const LABEL_MAX = 116
const LABEL_HALF = 23

export function settlementHalfWidth(size: SettlementSize) { return HALF[size] }
export function settlementReach(style: SettlementStyle) { return REACH[style] }

export function settlementStyle(place: Place, size: SettlementSize, marks: Landmark[]): SettlementStyle {
  /** Inside the place itself: neighbouring villages a kilometre away must not set the roofs. */
  const close = marks.filter((mark) => Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= .7)
  const minarets = close.filter((mark) => mark.kind === 'minaret').length
  if (minarets >= 2 && !close.some((mark) => mark.kind === 'synagogue')) return 'flat-hill'
  if (place.lat < 31.25 || /נגב|ערבה|ים המלח/.test(place.regionHe)) return 'flat-desert'
  /** A city (Umm al-Fahm, Tiberias) is concrete and stone blocks even under 50 000 people. */
  if (size === 'large' || place.settlementType === 'city') return 'blocks'
  return 'tile'
}

interface Input {
  style: SettlementStyle
  size: SettlementSize
  centerX: number
  centerY: number
  width: number
  ground: (x: number) => number
  litShare: number
  seed: number
  /** Absorbed buildings (px x, width, base y): houses that would stand over or behind them give way. */
  absorbed?: { x: number; w: number; base: number; kind: Landmark['kind'] }[]
  /** Lowest base a house may have: under it the sheet would cut the house to a stub. */
  floor?: number
  /** Boxes no house may stand under (the sun-event caption), in px. */
  keepOut?: { left: number; right: number; top: number; bottom: number }[]
}

/** One storey of a block house in px (blocks.tsx draws a window row per storey). */
export const STOREY = 2.8
export const PARAPET = 1.5

function dims(style: SettlementStyle, row: number, index: number, random: () => number) {
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

function hitsDot(house: Omit<House, 'lit' | 'seed'>, cx: number, cy: number) {
  const nx = Math.max(house.x - house.w / 2, Math.min(cx, house.x + house.w / 2))
  // Roof parapets and water heaters stand up to 1.8 px above the body.
  const ny = Math.max(house.baseY - house.h - 1.8, Math.min(cy, house.baseY))
  return Math.hypot(nx - cx, ny - cy) < DOT_R
}

function offsets(count: number, row: number, pitch: number, random: () => number) {
  if (row === 0) {
    return Array.from({ length: count }, (_, i) => (i % 2 ? 1 : -1) * (6 + 4.5 + Math.floor(i / 2) * pitch)
      + (random() - .5) * 3)
  }
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * pitch + (random() - .5) * 2)
}

export function composeSettlement(input: Input): Settlement {
  const { style, size, centerX, centerY, width, ground, litShare } = input
  const random = seeded(input.seed)
  const extra = Math.max(0, Math.floor((width - 375) / 120))
  const step = ROW_STEP[style]
  /** On a steep face the town packs tighter and its terraces climb from the dot, a mass rather than a single file. */
  const fall = ground(centerX + 8) - ground(centerX - 8)
  const steep = Math.abs(fall) / 16 > .6
  const pitch = PITCH[style] * (steep ? .6 : 1)
  const lean = steep ? -Math.sign(fall) * pitch * 3 : 0
  const counts = style === 'blocks' ? [...ROWS[size], ROWS[size][2] - 1] : ROWS[size]
  let rows = counts.map((count) => count + extra)
  while (rows.length > 1 && centerY + 7 + step * (rows.length - 1) + 2 > LABEL_MAX) rows = rows.slice(0, -1)
  const underLabel = (left: number, right: number) => right > centerX - LABEL_HALF - 2 && left < centerX + LABEL_HALF + 2
  const houses: House[] = []
  const contours: string[] = []
  rows.forEach((count, row) => {
    const xs = offsets(count, row, pitch, random).map((offset) => centerX + offset + (row ? lean : 0))
    xs.forEach((x, index) => {
      const size = dims(style, row, index, random)
      const rise = ground(x) - centerY
      if (rise > REACH[style].down || -rise > REACH[style].up) return
      const placed = seat(ground, x, size.w, row * step, true)
      if (!placed) return
      const house = { x, baseY: placed.baseY, w: placed.w, h: size.h + (row ? 0 : (random() - .5) * 2), row }
      if (house.baseY - house.h < 4 || house.baseY > (input.floor ?? 127) || hitsDot(house, centerX, centerY)) return
      if (input.keepOut?.some((box) => house.x + house.w / 2 > box.left - 2 && house.x - house.w / 2 < box.right + 2
        && house.baseY > box.top - 2 && house.baseY - house.h - 1.8 < box.bottom + 2)) return
      /** Houses round the absorbed hall stay no taller than it, so its minaret rises clear of the town. */
      if (input.absorbed?.some((mark) => mark.kind !== 'highrise' && Math.abs(mark.x - x) < (mark.w + house.w) / 2 + 1
        && house.baseY - house.h - 1.8 < mark.base - 6)) return
      houses.push({ ...house, lit: random() < litShare, seed: Math.floor(random() * 1e6) })
    })
    if (row > 0 && (style === 'tile' || style === 'blocks')) {
      const path = terraceLine(houses.filter((house) => house.row === row), (x) => ground(x) + row * step + 1,
        (x, y) => (underLabel(x, x) && y > centerY + 4) || (style === 'blocks' && Math.floor(x / 10) % 2 !== row % 2))
      if (path) contours.push(path)
    }
  })
  const above = houses.filter((house) => underLabel(house.x - house.w / 2, house.x + house.w / 2))
  const labelTop = Math.min(LABEL_MAX, Math.max(centerY + 7, ...above.map((house) => house.baseY + 2)))
  const kept = houses.filter((house) => !underLabel(house.x - house.w / 2, house.x + house.w / 2)
    || house.baseY + 2 <= labelTop)
  const halfWidth = kept.reduce((max, house) => Math.max(max, Math.abs(house.x - centerX) + house.w / 2), 0)
  return { style, houses: kept, contours, labelTop, halfWidth }
}
