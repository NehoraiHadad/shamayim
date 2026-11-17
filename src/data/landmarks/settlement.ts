import type { Place } from '../../config/place'
import { offsetKm } from './project'
import { seat } from './seat'
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
const PITCH: Record<SettlementStyle, number> = { tile: 9, 'flat-hill': 7, 'flat-desert': 7, blocks: 8 }
const ROW_STEP: Record<SettlementStyle, number> = { tile: 5.5, 'flat-hill': 4, 'flat-desert': 6, blocks: 5.5 }
const DOT_R = 5.5
const LABEL_MAX = 116
const LABEL_HALF = 23
const RIM = 5

export function settlementHalfWidth(size: SettlementSize) { return HALF[size] }

export function settlementStyle(place: Place, size: SettlementSize, marks: Landmark[]): SettlementStyle {
  /** Inside the place itself: neighbouring villages a kilometre away must not set the roofs. */
  const close = marks.filter((mark) => Math.hypot(offsetKm(place, mark).dx, offsetKm(place, mark).dy) <= .7)
  const minarets = close.filter((mark) => mark.kind === 'minaret').length
  if (minarets >= 2 && !close.some((mark) => mark.kind === 'synagogue')) return 'flat-hill'
  if (place.lat < 31.25 || /נגב|ערבה|ים המלח/.test(place.regionHe)) return 'flat-desert'
  if (size === 'large') return 'blocks'
  return 'tile'
}

export function seeded(seed: number) {
  let state = seed >>> 0 || 1
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashId(id: string) { return [...id].reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) }

interface Input {
  style: SettlementStyle
  size: SettlementSize
  centerX: number
  centerY: number
  width: number
  ground: (x: number) => number
  litShare: number
  seed: number
  /** Absorbed buildings (px x and width): the skyline house in their slot gives way. */
  absorbed?: { x: number; w: number }[]
}

function dims(style: SettlementStyle, row: number, index: number, random: () => number) {
  const shrink = row === 2 ? .85 : 1
  if (style === 'tile') return index % 3 === 2 ? { w: 9 * shrink, h: 7 * shrink } : { w: 7 * shrink, h: 6 * shrink }
  if (style === 'blocks') {
    return row === 0 ? { w: 6 + random() * 3, h: 9 + random() * 6 } : { w: 6 + random() * 3, h: (7 + random() * 3) * shrink }
  }
  return { w: (6 + random() * 2) * shrink, h: (5 + random() * 3) * shrink }
}

function hitsDot(house: Omit<House, 'lit' | 'seed'>, cx: number, cy: number) {
  const nx = Math.max(house.x - house.w / 2, Math.min(cx, house.x + house.w / 2))
  const ny = Math.max(house.baseY - house.h, Math.min(cy, house.baseY))
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
  let rows = ROWS[size].map((count) => count + extra)
  while (rows.length > 1 && centerY + 7 + step * (rows.length - 1) + 2 > LABEL_MAX) rows = rows.slice(0, -1)
  const underLabel = (left: number, right: number) => right > centerX - LABEL_HALF - 2 && left < centerX + LABEL_HALF + 2
  const houses: House[] = []
  const contours: string[] = []
  rows.forEach((count, row) => {
    const xs = offsets(count, row, PITCH[style], random).map((offset) => centerX + offset)
    xs.forEach((x, index) => {
      const size = dims(style, row, index, random)
      /** Desert towns sit on the plateau rim in level rows; nothing climbs down the cliff. */
      if (style === 'flat-desert' && Math.abs(ground(x) - centerY) > RIM) return
      const placed = seat(ground, x, size.w, row * step, true)
      if (!placed) return
      const house = { x, baseY: placed.baseY, w: placed.w, h: size.h + (row ? 0 : (random() - .5) * 2), row }
      if (house.baseY - house.h < 4 || house.baseY > 127 || hitsDot(house, centerX, centerY)) return
      if (row === 0 && input.absorbed?.some((mark) => Math.abs(mark.x - x) < (mark.w + house.w) / 2 + 1)) return
      houses.push({ ...house, lit: random() < litShare, seed: Math.floor(random() * 1e6) })
    })
    if (row > 0 && (style === 'tile' || style === 'blocks')) {
      const span = (count - 1) / 2 * PITCH[style] + 5
      let path = ''
      let pen = 'M'
      for (let x = centerX - span; x <= centerX + span; x += 2) {
        const y = ground(x) + row * step + 1
        if (underLabel(x, x) && y > centerY + 4) { pen = 'M'; continue }
        path += `${pen}${x.toFixed(1)} ${y.toFixed(1)}`
        pen = 'L'
      }
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
