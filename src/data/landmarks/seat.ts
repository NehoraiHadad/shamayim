/**
 * Seat a box of width `w` on sloped ground (ILLUSTRATION.md R2): the base is level with the lower ground edge, so the
 * downhill corner touches and the uphill corner is buried. Too steep → shrink once to 70 %, then give up.
 */
export function seat(ground: (x: number) => number, x: number, w: number, sink = 0, steepOk = false,
): { baseY: number; w: number } | null {
  for (const width of [w, w * .7]) {
    const left = ground(x - width / 2)
    const right = ground(x + width / 2)
    if (steepOk || Math.abs(left - right) <= .6 * width) return { baseY: Math.max(left, right) + 1 + sink, w: width }
  }
  return null
}

/** Ground height in px at px x, from points given in the 375-wide scene units. */
export function groundFn(points: [number, number][], width: number) {
  const scaled = points.map(([x, y]) => [x * width / 375, y] as const)
  return (x: number) => {
    if (!scaled.length) return 128
    if (x <= scaled[0][0]) return scaled[0][1]
    const last = scaled.at(-1)!
    if (x >= last[0]) return last[1]
    const i = scaled.findIndex(([px]) => px >= x)
    const [ax, ay] = scaled[i - 1]
    const [bx, by] = scaled[i]
    return ay + (by - ay) * (x - ax) / (bx - ax)
  }
}
