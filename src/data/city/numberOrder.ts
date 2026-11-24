/** Items in one order, and the steps the numbers are told apart by. */
const TURNS = 2 ** 20, STEPS = 2 ** 32

/**
 * The items by `value`, highest first, the equal ones by `tie` (and as they come where that says nothing): the same as a
 * stable sort by the two, with the thousands ordered as numbers alone and compared only where a step cannot tell them apart.
 */
export function highestFirst<T>(items: readonly T[], value: (item: T) => number, tie: (a: T, b: T) => number = () => 0): T[] {
  const n = items.length, values = new Float64Array(n)
  let low = Infinity, high = -Infinity
  for (let i = 0; i < n; i++) {
    const v = value(items[i])
    values[i] = v
    if (v < low) low = v
    if (v > high) high = v
  }
  const scale = high > low ? (STEPS - 1) / (high - low) : 0
  // A number's step and its turn, as one whole number.
  for (let i = 0; i < n; i++) values[i] = Math.floor((high - values[i]) * scale) * TURNS + i
  values.sort()
  // Each one's step alone again, its turn told by what is left of the number.
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    const step = Math.floor(values[i] / TURNS)
    out.push(items[values[i] - step * TURNS])
    values[i] = step
  }
  const exact = (a: T, b: T) => value(b) - value(a) || tie(a, b)
  for (let from = 0, to = 1; from < n; from = to++) {
    while (to < n && values[to] === values[from]) to++
    if (to - from === 1) continue
    const level = out.slice(from, to).sort(exact)
    for (let i = from; i < to; i++) out[i] = level[i - from]
  }
  return out
}
