/**
 * `buildWorld` cost under node with living-land data (offline, synthetic grids from `src/test/livingLandFixtures.ts`).
 * Measures a cold build (fresh builder: every part computed, `world.land` included) and a warm hour scrub (same builder,
 * same date: `world.land` reused). Run on two revisions to compare before/after.
 *
 * Usage: `npx tsx scripts/land/benchWorld.ts [--runs=40]`
 */
import { performance } from 'node:perf_hooks'
import { fullLandData, makeWorldInput, SHADMOT } from '../../src/test/livingLandFixtures'
import { buildWorld, makeWorldBuilder } from '../../src/world/world'

const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 40)
const input = makeWorldInput(SHADMOT, '2026-11-17T06:00', fullLandData())
const hours = Array.from({ length: 18 }, (_, i) => `2026-11-17T${String(i + 6).padStart(2, '0')}:00` as const)

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil(xs.length * 0.95) - 1)]

for (let i = 0; i < 5; i++) buildWorld(input) // JIT warm-up

const cold: number[] = []
for (let i = 0; i < runs; i++) {
  const t = performance.now(); buildWorld(input); cold.push(performance.now() - t)
}

const scrub: number[] = []
for (let i = 0; i < Math.max(1, Math.floor(runs / 4)); i++) {
  const build = makeWorldBuilder()
  build(input)
  for (const selected of hours) {
    const t = performance.now(); build({ ...input, selected }); scrub.push(performance.now() - t)
  }
}

const fmt = (xs: number[]) => `median ${median(xs).toFixed(2)} ms, p95 ${p95(xs).toFixed(2)} ms (n=${xs.length})`
console.log(`buildWorld cold:  ${fmt(cold)}`)
console.log(`buildWorld scrub: ${fmt(scrub)}`)
