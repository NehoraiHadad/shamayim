import type { SizeClass } from './settlement'

/**
 * A house in three bytes: east and north of the group's south-west corner in 2 m steps (10 bits each), its orientation
 * bit, its size class (2 bits) and its outline bit. The corner is in degrees; a degree of longitude is measured at it.
 */
export const HOUSE_STEP_M = 2
export const HOUSE_STEPS = 1024
export const HOUSE_BYTES = 3
/** Metres in a degree of latitude, as `offsetKm` counts them. */
export const LAT_M = 111_320
export const lonM = (lat: number) => LAT_M * Math.cos(lat * Math.PI / 180)

/** Steps east (`x`) and north (`y`) of the corner. */
export interface StoredHouse { x: number; y: number; across: boolean; size: SizeClass; outline: boolean }

export function encodeHouses(houses: readonly StoredHouse[]): string {
  let bytes = ''
  for (const { x, y, across, size, outline } of houses) {
    const inside = [x, y].every(v => Number.isInteger(v) && v >= 0 && v < HOUSE_STEPS)
    if (!inside) throw new RangeError(`A house at ${x}, ${y} steps is outside its group's box`)
    const word = x | y << 10 | Number(across) << 20 | size << 21 | Number(outline) << 23
    bytes += String.fromCharCode(word & 255, word >> 8 & 255, word >> 16 & 255)
  }
  return btoa(bytes)
}

/** The houses of a record, or null when the text is not whole houses. */
export function decodeHouses(text: string): StoredHouse[] | null {
  let bytes: string
  try { bytes = atob(text) } catch { return null }
  if (!bytes.length || bytes.length % HOUSE_BYTES) return null
  return Array.from({ length: bytes.length / HOUSE_BYTES }, (_, i) => {
    const [a, b, c] = [0, 1, 2].map(k => bytes.charCodeAt(i * HOUSE_BYTES + k))
    const word = a | b << 8 | c << 16
    return { x: word & 1023, y: word >> 10 & 1023, across: Boolean(word >> 20 & 1), size: (word >> 21 & 3) as SizeClass,
      outline: Boolean(word >> 23 & 1) }
  })
}
