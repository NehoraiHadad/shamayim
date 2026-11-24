type Points = readonly (readonly [number, number])[]
/** A rule's path through points. */
export type Stroke = (points: Points) => string

const at = (x: number, y: number) => `${x.toFixed(2)} ${y.toFixed(2)}`

/** A ruled pen: smooth through the points. */
export const penPath: Stroke = (points) => {
  let d = `M${at(...points[0])}`
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i], [nx, ny] = points[i + 1]
    d += `Q${at(x, y)} ${at((x + nx) / 2, (y + ny) / 2)}`
  }
  return `${d}L${at(...points[points.length - 1])}`
}

/** Wavelengths (px) of the hand's sway. */
const SWAY = [23, 9.5]

/** A pencil: the same line with a hand's sway, of its own in each pass (a function of the place on the paper alone). */
export const pencilPath = (pass: number): Stroke => (points) => penPath(points.map(([x, y]) => {
  const turn = pass * 2.1 + y * .05
  return [x + .25 * Math.sin(y / 3 + turn), y + .38 * Math.sin(x / SWAY[0] * 6.28 + turn) + .2 * Math.sin(x / SWAY[1] * 6.28 + turn * 1.7)] as const
}))
