import type { Place } from '../../config/place'
import { offsetKm } from './project'
import { seeded } from './hash'
import { seat } from './seat'
import { LABEL_MAX, shedDimensions, templateDimensions, templateRows, TWO_STOREY_RISE, type RowPlan } from './settlementPlan'
import { terraceLine } from './terraces'
import type { Landmark } from './types'

export { PARAPET, STOREY } from './settlementPlan'

/** The place's own houses, composed as one cluster draped over the crest (docs/design/ILLUSTRATION.md §4). */
export type SettlementStyle = 'tile' | 'flat-hill' | 'flat-desert' | 'blocks'
export type SettlementSize = 'small' | 'medium' | 'large'

export interface House {
  x: number; baseY: number; w: number; h: number; row: number; lit: boolean; seed: number
  /** A farm shed from the mapped big roofs; a two-storey house from the measured levels. */
  kind?: 'shed'; storeys?: 2
}
export interface Settlement {
  style: SettlementStyle
  houses: House[]
  /** Terrace lines between face rows, as SVG path data in px. */
  contours: string[]
  /** Top of the elevation label: just under the houses that stand above it. */
  labelTop: number
  halfWidth: number
  /**
   * Nothing in the data says what the roofs are like: half the houses red-tiled, half flat (drawn so by seed), rather
   * than guessing every place is a red-tiled moshav.
   */
  mixed?: boolean
  /** City mode: houses within `half` px of `centerX` are drawn in full; the rest merge into a mass per row. */
  detail?: { centerX: number; half: number }
}

/**
 * How far a house's ground may rise above / fall below the dot (px): houses spread along the contour near the crest
 * instead of running down a steep face in a staircase. Desert towns stay on the plateau rim.
 */
const REACH: Record<SettlementStyle, { up: number; down: number }> = { tile: { up: 14, down: 12 },
  'flat-hill': { up: 14, down: 12 }, 'flat-desert': { up: 5, down: 5 }, blocks: { up: 40, down: 24 } }
const DOT_R = 5.5
const LABEL_HALF = 23

export const desertSettlement = (place: Place) => place.lat < 31.25 || /נגב|ערבה|ים המלח/.test(place.regionHe)
export function settlementReach(style: SettlementStyle) { return REACH[style] }

export function settlementStyle(place: Place, size: SettlementSize, marks: Landmark[]): SettlementStyle {
  /** Inside the place itself: neighbouring villages a kilometre away must not set the roofs. */
  // A town spreads further than a village: its own mosques may stand a kilometre or more from its point.
  const within = size === 'small' ? .7 : size === 'medium' ? 1.3 : 2
  const close = marks.filter((mark) => Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= within)
  const minarets = close.filter((mark) => mark.kind === 'minaret').length
  if (minarets >= 1 && !close.some((mark) => mark.kind === 'synagogue')) return 'flat-hill'
  if (desertSettlement(place)) return 'flat-desert'
  /** A city (Umm al-Fahm, Tiberias) is concrete and stone blocks even under 50 000 people. */
  if (size === 'large' || place.settlementType === 'city') return 'blocks'
  return 'tile'
}

export interface SettlementInput {
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

function hitsDot(house: Omit<House, 'lit' | 'seed'>, cx: number, cy: number) {
  const nx = Math.max(house.x - house.w / 2, Math.min(cx, house.x + house.w / 2))
  // Roof parapets and water heaters stand up to 1.8 px above the body.
  const ny = Math.max(house.baseY - house.h - 1.8, Math.min(cy, house.baseY))
  return Math.hypot(nx - cx, ny - cy) < DOT_R
}

export function underSettlementLabel(centerX: number, left: number, right: number) {
  return right > centerX - LABEL_HALF - 2 && left < centerX + LABEL_HALF + 2
}

export function givesWay(house: Pick<House, 'x' | 'w' | 'baseY' | 'h'>, absorbed: SettlementInput['absorbed']) {
  return absorbed?.some(mark => mark.kind !== 'highrise' && Math.abs(mark.x - house.x) < (mark.w + house.w) / 2 + 1
    && house.baseY - house.h - 1.8 < mark.base - 6) ?? false
}

export function settlementLabel(houses: House[], centerX: number, centerY: number) {
  const overLabel = (house: House) => underSettlementLabel(centerX, house.x - house.w / 2, house.x + house.w / 2)
  const above = houses.filter(overLabel)
  const top = Math.min(LABEL_MAX, Math.max(centerY + 7, ...above.map(house => house.baseY + 2)))
  return { top, houses: houses.filter(house => !overLabel(house) || house.baseY + 2 <= top) }
}
export function composeSettlement(input: SettlementInput, plan?: RowPlan[]): Settlement {
  const { style, centerX, centerY, ground, litShare } = input
  const random = seeded(input.seed)
  const rows = plan ?? templateRows(input)
  const floor = input.floor ?? 127
  const houses: House[] = []
  const contours: string[] = []
  rows.forEach(({ row, centers, sink, reach = 1, kind, dims }) => {
    centers(random).forEach((x, index) => {
      const { w, h, storeys } = kind ? shedDimensions(random) : dims?.(row, index, random) ?? templateDimensions(style, row, index, random)
      const rise = ground(x) - centerY
      if (rise > REACH[style].down * reach || -rise > REACH[style].up * reach) return
      const baseY = seat(ground, x, w, sink, true)?.baseY
      if (baseY == null) return
      const house = { x, baseY, w, h: h + (row || kind ? 0 : (random() - .5) * 2), row }
      // Under the dot a two-storey house keeps one storey rather than vanish into it.
      let floors = storeys
      if (floors && hitsDot(house, centerX, centerY)) { house.h -= TWO_STOREY_RISE; floors = undefined }
      if (baseY - house.h < 4 || baseY > floor || hitsDot(house, centerX, centerY) ||
        input.keepOut?.some(b => x + w / 2 > b.left - 2 && x - w / 2 < b.right + 2 &&
          baseY > b.top - 2 && baseY - house.h - 1.8 < b.bottom + 2)) return
      if (givesWay(house, input.absorbed)) return
      if (!kind && houses.some(other => other.kind && other.row === row && Math.abs(other.x - x) < (other.w + w) / 2 + .5)) return
      // Sheds stay dark at night: no one lives in a chicken house.
      const lit = random() < litShare && !kind
      houses.push({ ...house, ...(kind && { kind }), ...(floors && { storeys: floors }), lit, seed: Math.floor(random() * 1e6) })
    })
    if (!kind && row > 0 && (style === 'tile' || style === 'blocks')) {
      const path = terraceLine(houses.filter((house) => house.row === row), (x) => ground(x) + sink + 1,
        (x, y) => (underSettlementLabel(centerX, x, x) && y > centerY + 4) ||
          (style === 'blocks' && Math.floor(x / 10) % 2 !== row % 2))
      if (path) contours.push(path)
    }
  })
  const { top: labelTop, houses: kept } = settlementLabel(houses, centerX, centerY)
  const halfWidth = kept.reduce((max, house) =>
    Math.max(max, Math.abs(house.x - centerX) + house.w / 2), 0)
  return { style, houses: kept, contours, labelTop, halfWidth }
}
