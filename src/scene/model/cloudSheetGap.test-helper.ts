/** Four-connected clear component, with exposed pixel edges grouped into
 * collinear runs. Viewport edges are excluded from the cloud perimeter. */
export function gapStraightRun(mask: Uint8Array, width: number, x: number, y: number) {
  const seed = y * width + x
  if (!mask[seed]) return 0
  const queue = [seed]
  const lines = new Map<number, number[]>()
  let perimeter = 0
  mask[seed] = 2
  for (const pixel of queue) {
    const col = pixel % width, row = Math.floor(pixel / width)
    const neighbors = [col ? pixel - 1 : -1, col + 1 < width ? pixel + 1 : -1, pixel - width, pixel + width]
    for (let side = 0; side < neighbors.length; side++) {
      const next = neighbors[side]
      if (next < 0 || next >= mask.length || mask[next] === 2) continue
      if (mask[next]) {
        mask[next] = 2
        queue.push(next)
        continue
      }
      const vertical = side < 2
      const key = 4 * (vertical ? col + side : row + side - 2) + side
      const line = lines.get(key) ?? []
      line.push(vertical ? row : col)
      lines.set(key, line)
      perimeter++
    }
  }
  let longest = 0
  for (const line of lines.values()) {
    line.sort((a, b) => a - b)
    let run = 0, previous = -2
    for (const offset of line) {
      run = offset === previous + 1 ? run + 1 : 1
      longest = Math.max(longest, run)
      previous = offset
    }
  }
  return perimeter ? longest / perimeter : 0
}
