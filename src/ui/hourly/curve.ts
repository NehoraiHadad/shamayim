export interface Pt {
  x: number
  y: number
}

/** Smooth path through points (Catmull-Rom converted to cubic Béziers). */
export function smoothPath(pts: Pt[]): string {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

/** Maps a value into a vertical band [pad, height - pad], higher values nearer the top. */
export function scaleY(value: number, min: number, max: number, height: number, pad: number): number {
  const span = Math.max(1, max - min)
  return pad + (1 - (value - min) / span) * (height - 2 * pad)
}

/** Fills gaps (null) by linear interpolation between neighbours; edges copy the nearest value. */
export function fillGaps(values: (number | null)[]): number[] {
  const known = values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0)
  if (!known.length) return values.map(() => 0)
  return values.map((v, i) => {
    if (v !== null) return v
    const prev = [...known].reverse().find((k) => k < i)
    const next = known.find((k) => k > i)
    if (prev === undefined) return values[next!] as number
    if (next === undefined) return values[prev] as number
    const a = values[prev] as number
    const b = values[next] as number
    return a + ((b - a) * (i - prev)) / (next - prev)
  })
}
