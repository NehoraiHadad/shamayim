/*
 * What of a raster over the sky goes on under eye level (`below` px): what it has there, down to the far horizon. One raster,
 * so no seam; nothing without it.
 */

/** Rows more, of a raster of `rows` over `height` px. */
export const rowsBelow = (below: number | undefined, height: number, rows: number) =>
  below ? Math.ceil((below * (rows - 1)) / height) : 0

/** The last of `rows` rows of a raster of `row` values each, laid again in the `more` under it. */
export function carryDown(data: Uint8ClampedArray | Float32Array, row: number, rows: number, more: number): void {
  for (let j = rows; j < rows + more; j++) data.copyWithin(j * row, (rows - 1) * row, rows * row)
}

/** The rows up from the last of `rows`, laid again down the `more` under it: a deck's forms go on, with no edge and no streaks. */
export function turnDown(data: Uint8ClampedArray, row: number, rows: number, more: number): void {
  for (let j = 0; j < more; j++) {
    const from = Math.max(0, rows - 2 - j)
    data.copyWithin((rows + j) * row, from * row, (from + 1) * row)
  }
}
