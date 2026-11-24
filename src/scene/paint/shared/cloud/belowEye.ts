/*
 * What of a raster over the sky goes on under eye level (`below` px): its last row again, down to there. One raster, so no
 * seam; nothing without it.
 */

/** Rows more, of a raster of `rows` over `height` px. */
export const rowsBelow = (below: number | undefined, height: number, rows: number) =>
  below ? Math.ceil((below * (rows - 1)) / height) : 0

/** The last of `rows` rows of a raster of `row` values each, laid again in the `more` under it. */
export function carryDown(data: Uint8ClampedArray | Float32Array, row: number, rows: number, more: number): void {
  for (let j = rows; j < rows + more; j++) data.copyWithin(j * row, (rows - 1) * row, rows * row)
}
