/**
 * The land-cover grid: what covers the ground (ESA WorldCover 2021, 10 m), kept at 6 × 6 of its pixels (~60 × 50 m)
 * by majority, in 0.1° cells of `LAND_N` × `LAND_N`, row-major from the north-west corner. Built by
 * `scripts/land/build.ts`, served from `public/data/land/il`.
 */
export const LAND_N = 200
export const LAND_STEP = 0.1 / LAND_N

/** Land cover classes, in a stable order (the stored letters are 'a' + index). */
export const COVER = ['none', 'tree', 'shrub', 'grass', 'crop', 'built', 'bare', 'snow', 'water', 'wetland', 'moss'] as const
export type Cover = typeof COVER[number]
/** Open water's class (left out of land albedo; water is painted by `water.ts`). */
export const COVER_WATER = COVER.indexOf('water')

/** WorldCover's codes to our classes. */
export function coverOfWorldCover(code: number): number {
  return ({ 10: 1, 20: 2, 30: 3, 40: 4, 50: 5, 60: 6, 70: 7, 80: 8, 90: 9, 95: 9, 100: 10 } as Record<number, number>)[code] ?? 0
}

export const landCellKey = (lat: number, lon: number) => `${Math.floor(lat * 10)}_${Math.floor(lon * 10)}`

/** Runs as letter + count ("d150ca3": 150 grass, 1 none, 3 none…): a letter per class, the count when above 1. */
export function encodeLand(values: Uint8Array): string {
  let out = ''
  for (let i = 0; i < values.length;) {
    let j = i + 1
    while (j < values.length && values[j] === values[i]) j++
    out += String.fromCharCode(97 + values[i]) + (j - i > 1 ? String(j - i) : '')
    i = j
  }
  return out
}

export function decodeLand(runs: string, size = LAND_N * LAND_N): Uint8Array {
  const out = new Uint8Array(size)
  let at = 0
  for (let i = 0; i < runs.length;) {
    const value = runs.charCodeAt(i) - 97
    let j = i + 1
    while (j < runs.length && runs.charCodeAt(j) >= 48 && runs.charCodeAt(j) <= 57) j++
    const count = j > i + 1 ? Number(runs.slice(i + 1, j)) : 1
    out.fill(value, at, Math.min(size, at + count))
    at += count
    i = j
  }
  return out
}
