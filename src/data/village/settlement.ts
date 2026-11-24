/**
 * How a settlement stands on the ground, from one of two sources behind one shape: real building footprints where the
 * data is good, the 50 m cover cells everywhere else. Positions are km east and north of the place. No style, no clock.
 */

/** Something the settlement is drawn from: a house, or a cover cell that holds several. */
export interface SettlementSpot {
  dx: number
  dy: number
  /** How many houses it stands for: 1 for a footprint, the raster's estimate for a cell. */
  holds: number
  /** At the settlement's edge, with open ground beside it. */
  outline: boolean
  /** Its own, stable across loads and across the order of the file. */
  seed: number
}

/** Size classes of a footprint, by area: up to 120 m², 250 m², 600 m², and more. */
export type SizeClass = 0 | 1 | 2 | 3
export const SIZE_LIMITS_M2 = [120, 250, 600] as const
export const sizeClassOf = (areaM2: number) => SIZE_LIMITS_M2.filter(limit => areaM2 > limit).length as SizeClass

export interface FootprintHouse extends SettlementSpot {
  /** Its long side runs more east–west than north–south. */
  across: boolean
  size: SizeClass
  /** Its row in `rows`, or null when it stands alone. */
  row: number | null
}

export interface CoverCell extends SettlementSpot {
  /** The city raster knows this cell; otherwise `holds` is a plain guess. */
  known: boolean
}

/** Houses along a street: `spots` from `start`, `count` of them in walking order; a ring closes on itself. */
export interface SettlementRow { start: number; count: number; ring: boolean }

/** The linked group the place belongs to: its box in km from the place (west and south negative when the place is inside). */
export interface SettlementGroup { w: number; e: number; s: number; n: number; extentKm: number; houses: number }

export interface Provenance {
  source: string
  licence: { id: string; url: string }
  /** The lines that must be shown while it is drawn. */
  credits: readonly string[]
  release: string
  /** The day the file was built (UTC, `YYYY-MM-DD`); null when the source gives none. */
  built: string | null
}

export type SettlementSource =
  | { kind: 'footprints'; group: SettlementGroup; spots: readonly FootprintHouse[]; rows: readonly SettlementRow[]; provenance: Provenance }
  | { kind: 'cells'; group: SettlementGroup; spots: readonly CoverCell[]; provenance: Provenance }

export function groupOf(spots: readonly SettlementSpot[]): SettlementGroup {
  let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity, houses = 0
  for (const spot of spots) {
    w = Math.min(w, spot.dx)
    e = Math.max(e, spot.dx)
    s = Math.min(s, spot.dy)
    n = Math.max(n, spot.dy)
    houses += spot.holds
  }
  return { w, e, s, n, extentKm: Math.max(e - w, n - s), houses }
}
