/** Items in one order, and the steps the numbers are told apart by. */
const TURNS = 2 ** 20, STEPS = 2 ** 32

/**
 * The items by their `values`, highest first, the equal ones by `tie` (and as they come where that says nothing): the same
 * as a stable sort by the two, with the thousands ordered as numbers alone and compared only where a step cannot tell them apart.
 */
export function highestFirst<T>(items: readonly T[], values: readonly number[], tie: (a: T, b: T) => number = () => 0): T[] {
  const n = values.length, turns = new Float64Array(n)
  let low = Infinity, high = -Infinity
  for (let i = 0; i < n; i++) {
    const v = values[i]
    if (v < low) low = v
    if (v > high) high = v
  }
  const scale = high > low ? (STEPS - 1) / (high - low) : 0
  // A number's step and its turn, as one whole number.
  for (let i = 0; i < n; i++) turns[i] = Math.floor((high - values[i]) * scale) * TURNS + i
  turns.sort()
  const out: T[] = []
  const exact = (a: number, b: number) => values[b] - values[a] || tie(items[a], items[b]) || a - b
  for (let from = 0, to = 0; from < n; from = to) {
    const first = Math.floor(turns[from] / TURNS) * TURNS
    for (to = from + 1; to < n && turns[to] < first + TURNS;) to++
    if (to - from === 1) out.push(items[turns[from] - first])
    else for (const turn of Array.from(turns.subarray(from, to), t => t - first).sort(exact)) out.push(items[turn])
  }
  return out
}
