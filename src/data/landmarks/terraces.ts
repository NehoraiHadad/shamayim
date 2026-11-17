/**
 * A terrace line under one row of houses, as SVG path data in px: it follows the ground (`at`) only as far as the row's
 * own houses reach, and breaks where `skip` says (under the elevation label; for hill-town blocks, every other
 * stretch, so it reads as the odd retaining wall rather than one line across the town).
 */
export function terraceLine(row: { x: number; w: number }[], at: (x: number) => number,
  skip: (x: number, y: number) => boolean): string {
  if (!row.length) return ''
  const from = Math.min(...row.map((house) => house.x - house.w / 2))
  const to = Math.max(...row.map((house) => house.x + house.w / 2))
  let path = ''
  let pen = 'M'
  for (let x = from; x <= to; x += 2) {
    const y = at(x)
    if (skip(x, y)) { pen = 'M'; continue }
    path += `${pen}${x.toFixed(1)} ${y.toFixed(1)}`
    pen = 'L'
  }
  return path
}
