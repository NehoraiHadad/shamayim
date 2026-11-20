import { useEffect, useState } from 'react'
import { SCENE_STATS } from './useSurface'

/** `?perf=1`: the scene's timings on the page (p50 / p95 ms per step, memory), refreshed twice a second. */
export function PerfHud() {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(id)
  }, [])
  const rows = Object.entries(SCENE_STATS.summary())
  const mb = Object.values(SCENE_STATS.memory).reduce((a, b) => a + b, 0) / 2 ** 20
  return (
    <pre style={{ position: 'fixed', left: 4, bottom: 4, zIndex: 99, margin: 0, padding: 4, font: '10px/1.2 monospace',
      color: '#fff', background: 'rgb(0 0 0 / .6)', pointerEvents: 'none', direction: 'ltr' }}>
      {rows.map(([step, s]) => `${step} ${s.p50.toFixed(1)}/${s.p95.toFixed(1)} ms ×${s.n}`).join('\n')}
      {`\nmemory ${mb.toFixed(1)} MB`}
    </pre>
  )
}
