export interface TerrainSample {
  elevation: number
  latitude?: number
  longitude?: number
}

export interface TerrainPaths {
  near: string
  far: string
  centerY: number
  seaInView: boolean
}

const TOP = 18
const BOTTOM_GAP = 24
const MIN_RELIEF_METRES = 120

/** Profile points (x, y) west to east, lightly smoothed so sampling noise does not read as spikes. */
export function profilePoints(samples: readonly TerrainSample[], w = 375, h = 128): [number, number][] {
  const values = samples.map(({ elevation }) => Number.isFinite(elevation) ? elevation : 0)
  const smooth = values.map((v, i) => i === 0 || i === values.length - 1 ? v : (values[i - 1] + 2 * v + values[i + 1]) / 4)
  return smooth.map((value, index) => [
    values.length === 1 ? w / 2 : (index / (values.length - 1)) * w,
    profileY(samples, value, h),
  ])
}

/** Maps an ordered west-to-east elevation profile into a closed SVG land path with soft curves. */
export function profileToPath(samples: readonly TerrainSample[], w = 375, h = 128): string {
  if (samples.length === 0) return gentleHillsPath(w, h)
  const p = profilePoints(samples, w, h)
  // Catmull-Rom through the points, written as cubic Béziers.
  const curves = p.slice(1).map((b, i) => {
    const a = p[i]
    const before = p[i - 1] ?? a
    const after = p[i + 2] ?? b
    const c1 = [a[0] + (b[0] - before[0]) / 6, a[1] + (b[1] - before[1]) / 6]
    const c2 = [b[0] - (after[0] - a[0]) / 6, b[1] - (after[1] - a[1]) / 6]
    return `C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${round(b[0])} ${round(b[1])}`
  })
  return `M0 ${h}L${round(p[0][0])} ${round(p[0][1])}${curves.join('')}L${w} ${h}Z`
}

/** Stable fallback used while terrain loads or when the elevation service is unavailable. */
export function gentleHillsPath(w = 375, h = 128): string {
  return `M0 ${h}V72C48 48 92 52 136 70S220 88 264 62S334 48 ${w} 66V${h}Z`
}

export function sampleY(samples: readonly TerrainSample[], index: number, h = 128): number {
  const sample = samples[Math.min(Math.max(index, 0), Math.max(0, samples.length - 1))]
  return sample ? profileY(samples, sample.elevation, h) : h * 0.62
}

export function profileY(samples: readonly TerrainSample[], value: number, h = 128): number {
  if (!samples.length) return h * 0.62
  const values = samples.map((sample) => Number.isFinite(sample.elevation) ? sample.elevation : 0)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const range = Math.max(high - low, MIN_RELIEF_METRES)
  const offset = (range - (high - low)) / 2
  const drawable = Math.max(1, h - TOP - BOTTOM_GAP)
  const y = TOP + ((high + offset - value) / range) * drawable
  return Math.min(h, Math.max(0, y))
}

function round(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

type Pt = [number, number]

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
const cubicAt = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt =>
  lerp(lerp(lerp(p0, p1, t), lerp(p1, p2, t), t), lerp(lerp(p1, p2, t), lerp(p2, p3, t), t), t)

/**
 * The ridge line of a drawn land path, as points west to east: every corner, plus `steps` points along each curve.
 * Reads the absolute M, L, H, V, C, S and Q commands the scene paths use; the vertical sides down to the bottom edge
 * are left out. Marks and labels stand on these points, so they follow the line that is actually drawn.
 */
export function ridgePoints(d: string, steps = 6): Pt[] {
  const tokens = d.match(/[MLHVCSQZ]|-?\d*\.?\d+/g) ?? []
  const out: Pt[] = []
  let at: Pt = [0, 0]
  let lastControl: Pt | null = null
  let i = 0
  const num = () => Number(tokens[i++])
  const pt = (): Pt => [num(), num()]
  const add = (p: Pt) => {
    const prev = out[out.length - 1]
    if (prev && Math.abs(prev[0] - p[0]) < 0.01) prev[1] = Math.min(prev[1], p[1])
    else out.push(p)
  }
  const curve = (c1: Pt, c2: Pt, end: Pt) => {
    for (let s = 1; s <= steps; s++) add(cubicAt(at, c1, c2, end, s / steps))
    lastControl = c2
    at = end
  }
  let command = ''
  while (i < tokens.length) {
    if (/[A-Z]/.test(tokens[i])) command = tokens[i++]
    if (command === 'Z') break
    if (command === 'M') { at = pt(); lastControl = null; command = 'L'; continue }
    if (command === 'L') { at = pt(); add(at); lastControl = null; continue }
    if (command === 'H') { at = [num(), at[1]]; add(at); lastControl = null; continue }
    if (command === 'V') { at = [at[0], num()]; lastControl = null; continue }
    if (command === 'C') { const c1 = pt(); const c2 = pt(); curve(c1, c2, pt()); continue }
    if (command === 'S') {
      const c1: Pt = lastControl ? [2 * at[0] - lastControl[0], 2 * at[1] - lastControl[1]] : at
      const c2 = pt()
      curve(c1, c2, pt())
      continue
    }
    if (command === 'Q') {
      const q = pt()
      const end = pt()
      curve(lerp(at, q, 2 / 3), lerp(end, q, 2 / 3), end)
      continue
    }
    i++ // unknown token: skip
  }
  // The path's first ridge point is where it leaves the bottom edge (after "M0 128V…").
  const first = d.match(/^M\s*(-?[\d.]+)\s+[\d.]+\s*V\s*(-?[\d.]+)/)
  if (first) out.unshift([Number(first[1]), Number(first[2])])
  // The final "V128" drops to the bottom edge; it is not part of the ridge.
  return out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10])
}
