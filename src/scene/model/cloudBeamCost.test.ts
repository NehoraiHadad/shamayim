import { expect, it } from 'vitest'
import { sunLight } from '../../world/sceneLight'
import { smoothstep } from '../../domain/smoothstep'
import type { CloudLayer, WorldState } from '../../world/types'
import { cloudBeam, litTone } from './cloudBeam'
import { mixRgb } from './tone'
import type { RGB } from './types'

it('reports the cost of the old and new daytime cloud endpoints in CI', () => {
  const world = { bodies: { sun: { altitude: 11.95 } }, air: { visibilityKm: 12.4 },
    light: { diffuse: 0.94 },
    cloudField: { field: { layers: [
      { lattice: 'low', cover: 0.6, baseKm: 0.6, meanVKm: 0.5, kappa: 4 },
      { lattice: 'mid', cover: 0.85, baseKm: 4, meanVKm: 0.5, kappa: 4 },
      { lattice: 'high', cover: 0.32, baseKm: 8, meanVKm: 1, kappa: 0.2 },
    ] } },
  } as WorldState
  const layer: CloudLayer = { level: 'low', cover: 0.6, baseM: 600, banks: [], drift: 0, litUnderside: 0, rains: false }
  const body: RGB = [0.74, 0.77, 0.8]
  const behind: RGB = [0.325, 0.392, 0.478]
  const white: RGB = [1, 1, 1]
  const fade = 0.52 // diagnosis, Haifa 15:30
  const above = 0.152
  const altitude = world.bodies.sun.altitude
  const oldBeam = () => mixRgb(sunLight(altitude, world.air).rgb, white, 0.25 + 0.45 * smoothstep(6, 40, altitude))
  const oldTone = () => mixRgb(body, mixRgb(old, behind, fade), 1)
  const newBeam = () => cloudBeam(world, layer).direct
  const newTone = () => litTone(body, beam, Math.sin(altitude * Math.PI / 180) * above * (1 - fade))
  const old = oldBeam()
  const beam = newBeam()

  const n = 10_000
  const fns = { oldBeam, newBeam, oldTone, newTone }
  const runs = Object.entries(fns)
  const cost = Object.fromEntries(runs.map(([name]) => [name, [] as number[]]))
  let check = 0
  for (let run = 0; run < 7; run++) {
    for (const [name, fn] of run % 2 === 0 ? runs : [...runs].reverse()) {
      const start = performance.now()
      for (let i = 0; i < n; i++) check += fn()[0]
      if (run > 0) cost[name].push((performance.now() - start) / n)
    }
  }
  expect(check).toBeGreaterThan(0)
  console.log(JSON.stringify({ cloudMsPerLayer: cost, scenario: 'Haifa 15:30 light and cover, representative three-deck column' }))
})
