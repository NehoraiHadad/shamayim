/*
 * A field of colours gathered into a few flat ones, as a painter mixes a few pots for a hillside: weighted k-means in Oklab
 * started on the value's own quantiles (so the same land gives the same pots), then the labels. Pure.
 */

/** A hue's weight against a value's, and the rounds it takes. */
const HUE = 2.2, ROUNDS = 8

/** `lab` is [l, a, b] per cell; cells with `on` 0 are labelled but mix no pot. */
export function classesOf(lab: Float32Array, on: Uint8Array, k: number): { label: Uint8Array; pots: Float32Array; count: Uint32Array } {
  const n = on.length, cells = [...on.keys()].filter((i) => on[i]).sort((a, b) => lab[a * 3] - lab[b * 3])
  const pots = new Float32Array(k * 3), label = new Uint8Array(n), count = new Uint32Array(k)
  for (let c = 0; c < k; c++) {
    const at = cells[Math.floor(((c + 0.5) / k) * cells.length)] ?? 0
    pots.set(lab.subarray(at * 3, at * 3 + 3), c * 3)
  }
  const nearest = (i: number) => {
    let best = 0, least = Infinity
    for (let c = 0; c < k; c++) {
      const dl = lab[i * 3] - pots[c * 3], da = lab[i * 3 + 1] - pots[c * 3 + 1], db = lab[i * 3 + 2] - pots[c * 3 + 2]
      const d = dl * dl + HUE * HUE * (da * da + db * db)
      if (d < least) { least = d; best = c }
    }
    return best
  }
  for (let round = 0; round < ROUNDS; round++) {
    const sum = new Float64Array(k * 3)
    count.fill(0)
    for (const i of cells) {
      const c = nearest(i)
      count[c]++
      for (let m = 0; m < 3; m++) sum[c * 3 + m] += lab[i * 3 + m]
    }
    for (let c = 0; c < k; c++) if (count[c]) for (let m = 0; m < 3; m++) pots[c * 3 + m] = sum[c * 3 + m] / count[c]
  }
  for (let i = 0; i < n; i++) label[i] = nearest(i)
  return { label, pots, count }
}
