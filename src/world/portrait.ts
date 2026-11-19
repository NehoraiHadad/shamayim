import { seeded } from '../data/landmarks/hash'
import { settlementReach, type SettlementStyle } from '../data/landmarks/settlement'
import { DOT_R, overlaps, type Box, type Point } from './layout'
import type { PortraitHouse, PortraitPlan, PortraitTree } from './types'

/**
 * The village portrait (stage C4, docs/design/TRUE-SCENE-PLAN.md "the rule for the portrait"): the place's own houses as
 * an illustration round the dot, composed by one rule for every place from what the data says of it (its built-up
 * reach, its house style, its roofs), never by hand.
 *
 * The houses stand in contour rows hanging from the near ridge's own line (row 0 on the crest against the sky, each
 * further row a step down the face), so the village drapes over the land it is on. Along each row, outward from the dot
 * on both sides, the houses thin by a falloff of their distance from the dot (dense at the dot, sparse at the edge);
 * error diffusion along the row turns the falloff into houses without clumps or holes. Runs of 3–5 houses part for a
 * street, where a tree often stands; trees and cypresses also take some of the spots the falloff leaves empty, and
 * fringe the village's edge. Nothing stands in the dot's clearing, under a text zone, or over a mark of the place
 * among the roofs. Roofs follow the world's roof rule (`portraitStyle`): tiled, flat (with parapets and water heaters),
 * or mixed half and half where nothing is known.
 *
 * Independent of the hour and the box: scene px at the layout width, seeded by the place.
 */

export interface PortraitInput {
  dot: Point
  ground: (x: number) => number
  width: number
  style: SettlementStyle
  roofs: 'tile' | 'flat' | 'mixed'
  /** The portrait's reach (km): its built-up area out to its farthest corner, plus its fields. */
  reachKm: number
  /** The built-up area is known (the place's home cluster in the built-up map). */
  known: boolean
  seed: number
  /** What no house or tree may cover: the text zones and the marks among the roofs (px). */
  blocked: readonly Box[]
  /** The lowest base anything may have (the sheet's edge, less a stub). */
  floor: number
}

/** Px between contour rows, by style: blocks of flats stand taller and their rows further apart. */
const ROW_STEP: Record<SettlementStyle, number> = { tile: 3.8, 'flat-hill': 3.4, 'flat-desert': 3.6, blocks: 4.4 }
/** Share of spots the falloff leaves that a tree takes, by style (a desert place has few). */
const TREES: Record<SettlementStyle, number> = { tile: 0.55, 'flat-hill': 0.45, 'flat-desert': 0.2, blocks: 0.22 }
/** The falloff's steepness: at the portrait's half width the chance of a house is e^-FALL. */
const FALL = 1.5

/** Half the village in px: from its built-up reach (km), whatever its size; a place with no known area a small one. */
export function portraitHalf(reachKm: number, known: boolean): number {
  const built = known ? Math.max(0.3, reachKm - 1) : 0.5
  return Math.max(24, Math.min(64, 20 + 18 * built))
}

function dims(style: SettlementStyle, near: number, r: () => number) {
  const tall = r() < 0.2 + 0.35 * near
  switch (style) {
    case 'blocks': {
      const storeys = 2 + Math.floor(r() * (near > 0.6 ? 4 : 3))
      return { w: 4.5 + r() * 4.5, h: 1.5 + storeys * 2.6, storeys }
    }
    case 'flat-desert': return { w: 4 + r() * 3, h: tall ? 5.2 + r() : 3.2 + r() * 0.8, storeys: tall ? 2 : 1 }
    case 'flat-hill': return { w: 3.6 + r() * 2.8, h: tall ? 5.8 + r() * 1.2 : 3.6 + r() * 1.2, storeys: tall ? 2 : 1 }
    default: return { w: 4.2 + r() * 2.4, h: tall ? 5.4 + r() : 3.6 + r() * 1, storeys: tall ? 2 : 1 }
  }
}

/** The nearest distance from a box to a point. */
function boxDistance(box: Box, p: Point) {
  const nx = Math.max(box.left, Math.min(p.x, box.right)), ny = Math.max(box.top, Math.min(p.y, box.bottom))
  return Math.hypot(nx - p.x, ny - p.y)
}

export function composePortrait(input: PortraitInput): PortraitPlan {
  const { dot, ground, style, roofs, floor, blocked } = input
  const r = seeded(input.seed * 7 + 11)
  const halfPx = portraitHalf(input.reachKm, input.known)
  const step = ROW_STEP[style]
  const reach = settlementReach(style)
  const up = Math.max(reach.up * 1.4, halfPx * 0.55), down = Math.max(reach.down * 1.4, halfPx * 0.4)
  const houses: PortraitHouse[] = []
  const trees: PortraitTree[] = []
  const clear = DOT_R + 1

  const free = (box: Box) => box.top > 2 && box.bottom <= floor + 0.01 && boxDistance(box, dot) > clear
    && blocked.every((b) => !overlaps(box, b, 0.5))
  const onLand = (x: number) => { const rise = ground(x) - dot.y; return rise <= down && -rise <= up }

  const tree = (x: number, sink: number, near: number, row: number) => {
    const desert = style === 'flat-desert'
    const kind: PortraitTree['kind'] = desert ? (r() < 0.6 ? 'palm' : 'tree') : r() < 0.4 ? 'cypress' : 'tree'
    const s = 0.8 + r() * 0.5 + 0.2 * near
    const w = kind === 'cypress' ? 1.8 * s : kind === 'palm' ? 3.4 * s : 3 * s
    const h = kind === 'cypress' ? 5.2 * s + 1.6 : kind === 'palm' ? 5 * s + 1 : 3 * s + 0.6
    const base = ground(x) + sink + 0.6 + r() * 0.6
    const box = { left: x - w / 2, right: x + w / 2, top: base - h, bottom: base }
    if (!onLand(x) || !free(box)) return
    trees.push({ kind, x, base, w, h, row, seed: Math.floor(r() * 1e6) })
  }

  for (let row = 0; ; row++) {
    const sink = 1.1 + row * step
    // Lower rows are a little narrower: the village is a drape, widest along the crest.
    const rowHalf = halfPx * (1 - Math.min(0.45, 0.07 * row))
    let any = false
    for (const side of [-1, 1] as const) {
      let cursor = dot.x + side * r() * 4
      let acc = r() * 0.5, run = 0, runLength = 3 + Math.floor(r() * 3)
      while (Math.abs(cursor - dot.x) < rowHalf + 10) {
        const near = Math.max(0, 1 - Math.abs(cursor - dot.x) / halfPx)
        const { w, h, storeys } = dims(style, near, r)
        const left = side > 0 ? cursor : cursor - w
        const centre = left + w / 2
        const offset = Math.abs(centre - dot.x)
        const base = Math.max(ground(left), ground(left + w)) + sink + (r() - 0.5) * 0.5
        if (base <= floor) any = true
        if (offset > rowHalf) {
          // The fringe: a tree now and then just past the last houses.
          if (row < 4 && r() < 0.45) tree(centre, sink, 0, row)
          cursor += side * (w + 1.5 + r() * 2)
          continue
        }
        if (run >= runLength) {
          // A street: a gap, a tree in it more often than not.
          const gap = 2.2 + r() * 1.6
          if (r() < 0.6 * TREES[style] / 0.4) tree(cursor + side * gap / 2, sink, near, row)
          cursor += side * gap
          run = 0
          runLength = 3 + Math.floor(r() * 3)
          continue
        }
        const d = Math.hypot(offset / halfPx, row / 9)
        acc += Math.exp(-FALL * d * d)
        const roofTile = style !== 'blocks' && (roofs === 'tile' ? r() < 0.9 : roofs === 'mixed' ? r() < 0.5 : false)
        const roofRise = roofTile ? 2.2 : 1
        const box = { left, right: left + w, top: base - h - roofRise, bottom: base }
        // A house is due where the falloff has gathered half a house; a due spot that is blocked (the dot, a text zone, a
        // mark, the sheet) stays empty rather than pushing its house outward, so the density keeps to the falloff.
        const due = acc >= 0.5
        if (due) acc -= 1
        if (due && onLand(centre) && free(box) && base - h > 4) {
          houses.push({ x: left, base, w, h, storeys, row, roof: roofTile ? 'tile' : 'flat', heater: !roofTile && r() < (style === 'flat-desert' ? 0.6 : 0.45),
            tint: r(), seed: Math.floor(r() * 1e6) })
          run++
        } else if (!due && r() < TREES[style]) {
          tree(centre, sink, near, row)
        }
        cursor += side * (w + (r() < 0.25 ? 0.4 + r() * 1.2 : 0))
      }
    }
    if (!any || row > 14) break
  }
  return { halfPx, houses, trees }
}
