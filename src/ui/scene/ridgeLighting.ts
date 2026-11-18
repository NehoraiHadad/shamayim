type Point = readonly [number, number]

export function smoothstep(low: number, high: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)))
  return t * t * (3 - 2 * t)
}

/** How much taller the drawn ridges are than true scale (24 km across 375 px against a few hundred metres of relief). */
const EXAGGERATION = 3

/**
 * Light direction in drawn space (east, up). The side comes from the drawn disc (`lateral`: −1 at the setting point,
 * +1 at the rising point), so the lit flank always agrees with the sun the user sees; the height comes from the true
 * altitude, steepened by the drawing's vertical exaggeration, so a low sun grazes the land and leaves a terminator.
 */
export function ridgeLightRay(lateral: number, altitude: number): [number, number] {
  const rise = Math.tan(Math.max(.5, Math.min(80, altitude)) * Math.PI / 180) * EXAGGERATION
  return [Math.max(-1, Math.min(1, lateral)), rise]
}

interface Lighting {
  ray: Point | null
  noonWeight: number
  rimX: number | null
  depth: number
  outline?: readonly Point[]
}

/** Depth gained per px away from a band's end, so each band tapers to a point instead of ending in a cut. */
const TAPER = .25

/** Caps each band's depth by its distance from the nearest unlit sample (a forward and a backward pass). */
function taperEnds(samples: { x: number; amount: number }[]) {
  const pass = (order: number[]) => order.reduce((reach, i, k) => {
    const sample = samples[i]
    sample.amount = Math.min(sample.amount, reach)
    const next = samples[order[k + 1]]
    return next ? sample.amount + TAPER * Math.abs(next.x - sample.x) : reach
  }, Infinity)
  const forward = samples.map((_, i) => i)
  pass(forward)
  pass(forward.reverse())
}

const xy = (x: number, y: number) => `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`

export function ridgeLightPaths(profile: readonly Point[], { ray, noonWeight, rimX, depth, outline = profile }: Lighting) {
  const points = profile.filter(([x, y], i) =>
    Number.isFinite(x) && Number.isFinite(y) && (!i || x > profile[i - 1][0]))
  const length = ray ? Math.hypot(...ray) : 0
  const [east, up] = ray && length ? [ray[0] / length, ray[1] / length] : [0, 1]
  const samples = points.map(([x, y], i) => {
    const [left, right] = [points[i - 1] ?? points[i], points[i + 1] ?? points[i]]
    const slope = (left[1] - right[1]) / (right[0] - left[0] || 1)
    const facing = (up - slope * east) / Math.hypot(1, slope)
    let clearance = Infinity
    if (Math.abs(east) > .01) {
      const direction = Math.sign(east)
      for (let j = i + direction; j >= 0 && j < points.length; j += direction) {
        const [otherX, otherY] = points[j]
        clearance = Math.min(clearance, otherY - y + (otherX - x) * up / east)
      }
    }
    const strength = (1 - noonWeight) * Math.max(0, facing) + noonWeight * .2 / Math.hypot(1, slope)
    return { x, y, clearance, facing, amount: ray ? depth * strength * smoothstep(0, 1, clearance) : 0 }
  })
  taperEnds(samples)

  let crescent = ''
  let rim = ''
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]
    if (sample.amount > 0) {
      const first = i
      while (samples[i + 1]?.amount > 0) i++
      const band: Pick<typeof sample, 'x' | 'y' | 'amount'>[] = samples.slice(first, i + 1)
      const taper = (lit: typeof sample, dark: typeof sample) => {
        const t = dark.clearance <= 0 && Number.isFinite(lit.clearance)
          ? lit.clearance / (lit.clearance - dark.clearance)
          : dark.facing <= 0 && lit.facing > 0 ? lit.facing / (lit.facing - dark.facing) : 1
        return { x: lit.x + (dark.x - lit.x) * t, y: lit.y + (dark.y - lit.y) * t, amount: 0 }
      }
      if (first > 0) band.unshift(taper(samples[first], samples[first - 1]))
      if (i + 1 < samples.length) band.push(taper(samples[i], samples[i + 1]))
      if (band.length < 2) continue
      const top = Math.min(...band.map(({ y }) => y)) - 24
      const reversed = band.slice().reverse()
      crescent += `M${xy(band[0].x, top)}H${xy(band[band.length - 1].x, top).split(',')[0]}`
      crescent += `L${xy(reversed[0].x, reversed[0].y + reversed[0].amount)}`
      reversed.slice(1).forEach((end, index) => {
        const start = reversed[index]
        const before = reversed[index - 1] ?? start
        const after = reversed[index + 2] ?? end
        const bottom = ({ y, amount }: typeof start) => y + amount
        const dx = (end.x - start.x) / 3
        const tangent = (a: typeof start, b: typeof start) => (bottom(b) - bottom(a)) / (b.x - a.x || 1)
        crescent += `C${xy(start.x + dx, bottom(start) + dx * tangent(before, end))} ` +
          `${xy(end.x - dx, bottom(end) - dx * tangent(start, after))} ${xy(end.x, bottom(end))}`
      })
      crescent += 'Z'
    }
  }
  const rimSpans: [number, number][] = rimX === null ? [] : [[rimX - 70, rimX + 70]]
  if (rimX !== null) samples.forEach(({ x, y, amount }, index) => {
    const left = samples[index - 1]
    const right = samples[index + 1]
    const crest = amount > depth * .48 && left && right && y <= (left.y + right.y) / 2
    if (crest) rimSpans.push([(left.x + x) / 2, (x + right.x) / 2])
  })
  rimSpans.sort(([a], [b]) => a - b)
  const runs: [number, number][] = []
  for (const [start, end] of rimSpans) {
    const last = runs[runs.length - 1]
    if (last && start <= last[1]) last[1] = Math.max(last[1], end)
    else runs.push([start, end])
  }
  for (const [start, end] of runs) {
    let drawing = false
    for (let i = 1; i < outline.length; i++) {
      const [ax, ay] = outline[i - 1]
      const [bx, by] = outline[i]
      const from = Math.max(start, ax)
      const to = Math.min(end, bx)
      if (from >= to || bx <= ax) continue
      const yAt = (x: number) => ay + (by - ay) * (x - ax) / (bx - ax)
      if (!drawing) rim += `M${xy(from, yAt(from))}`
      rim += `L${xy(to, yAt(to))}`
      drawing = true
    }
  }
  return { crescent, rim }
}
