import type { EventKind, EventPlan, FlockOffset, LifeState } from './types'

const counts: Record<EventKind, [number, number]> = {
  storks: [6, 10], cranes: [7, 11], swifts: [5, 8], raptor: [1, 1], meteor: [1, 1],
}
const durations: Record<EventKind, number> = {
  storks: 28000, cranes: 21000, swifts: 7000, raptor: 27000, meteor: 450,
}
const gaps: Record<EventKind, [number, number]> = {
  storks: [60000, 110000], cranes: [60000, 110000], swifts: [35000, 60000],
  raptor: [90000, 150000], meteor: [50000, 110000],
}

export function rng(seed: number): () => number {
  let s = seed || 1
  return () => ((s = Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5 | 0) >>> 0) / 4294967296
}

export function planEvent(life: LifeState, seed: number, n: number): EventPlan | null {
  if (!life.eligible.length) return null
  const kind = life.eligible[n % life.eligible.length]
  const random = rng(seed + Math.imul(n + 1, 0x9e3779b1))
  const [lo, hi] = counts[kind]
  const [gapLo, gapHi] = n === 0 ? [5000, 9000] : gaps[kind]
  return {
    kind,
    delayMs: Math.round(gapLo + random() * (gapHi - gapLo)),
    count: Math.floor(lo + random() * (hi - lo + 1)),
    laneY: kind === 'swifts' ? 'low' : kind === 'meteor' ? 'free' : 'high',
    dir: life.dir,
    durationMs: durations[kind],
  }
}

export function flockOffsets(kind: EventKind, count: number, seed: number): FlockOffset[] {
  const random = rng(seed)
  if (kind === 'cranes') {
    const longArm = Math.ceil((count - 1) * 0.6)
    const angle = 32 * Math.PI / 180
    return [{ x: 0, y: 0 }, ...Array.from({ length: count - 1 }, (_, index) => {
      const arm = index < longArm ? 1 : -1
      const step = index < longArm ? index + 1 : index - longArm + 1
      return { x: -Math.cos(angle) * 13 * step + (random() * 4 - 2), y: arm * Math.sin(angle) * 13 * step + (random() * 4 - 2) }
    })]
  }
  if (kind === 'storks') {
    const points: FlockOffset[] = []
    for (let tries = 0; points.length < count && tries < 500; tries++) {
      const angle = random() * Math.PI * 2
      const radius = Math.sqrt(random())
      const point = { x: Math.cos(angle) * 35 * radius, y: Math.sin(angle) * 13 * radius }
      if (points.every((p) => Math.hypot(p.x - point.x, p.y - point.y) >= 10)) points.push(point)
    }
    return points
  }
  return Array.from({ length: count }, () => ({ x: 0, y: 0 }))
}
