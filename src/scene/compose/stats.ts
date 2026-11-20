/**
 * Scene timings (§3, performance budget): each step wrapped in `performance.mark/measure` (so a trace shows it) and kept
 * as samples for p50/p95; per-layer paint counts and times; the cached canvases' backing memory. The React shell leaves
 * it on `window.__sceneStats`; `?perf=1` shows it in a small HUD.
 */
export interface LayerStat { paints: number; lightPaints: number; hits: number; lastMs: number }

export interface StepSummary { n: number; p50: number; p95: number; max: number }

export interface SceneStats {
  steps: Record<string, number[]>
  layers: Record<string, LayerStat>
  /** Backing memory of each surface's visible and cached canvases (bytes). */
  memory: Record<string, number>
  record(step: string, ms: number): void
  time<T>(step: string, fn: () => T): T
  layer(id: string): LayerStat
  summary(): Record<string, StepSummary>
  reset(): void
}

/** Samples kept per step. */
const KEEP = 600

export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return 0
  const at = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))
  return sorted[at]
}

export function makeStats(now: () => number = () => performance.now()): SceneStats {
  const marks = typeof performance !== 'undefined' && typeof performance.mark === 'function'
    && typeof performance.measure === 'function'
  let serial = 0
  const stats: SceneStats = {
    steps: {},
    layers: {},
    memory: {},
    record(step, ms) {
      const list = (stats.steps[step] ??= [])
      list.push(ms)
      if (list.length > KEEP) list.splice(0, list.length - KEEP)
    },
    time(step, fn) {
      const id = `scene:${step}:${serial++}`
      if (marks) performance.mark(id)
      const start = now()
      try {
        return fn()
      } finally {
        stats.record(step, now() - start)
        if (marks) {
          try {
            performance.measure(`scene:${step}`, id)
            performance.clearMarks(id)
          } catch { /* a timeline that refuses the mark: the sample is kept all the same */ }
        }
      }
    },
    layer(id) {
      return (stats.layers[id] ??= { paints: 0, lightPaints: 0, hits: 0, lastMs: 0 })
    },
    summary() {
      return Object.fromEntries(Object.entries(stats.steps).map(([step, list]) => {
        const sorted = [...list].sort((a, b) => a - b)
        return [step, { n: list.length, p50: quantile(sorted, 0.5), p95: quantile(sorted, 0.95), max: sorted.at(-1) ?? 0 }]
      }))
    },
    reset() {
      stats.steps = {}
      for (const layer of Object.values(stats.layers)) Object.assign(layer, { paints: 0, lightPaints: 0, hits: 0, lastMs: 0 })
    },
  }
  return stats
}
