/**
 * `buildWorld` cost under Node with production-sized living-land grids (100×100 100 m near S2 +
 * 60×60 2 km far GIBS) compared against a fallback baseline (`land: null`).
 * Measures baseline cold, living-land cold, fallback -> living-land refinement on a warm builder,
 * and same-UTC-day hour scrubs (where `world.land` is reused).
 *
 * Usage: `npx tsx scripts/land/benchWorld.ts [--runs=40]`
 */
import { performance } from 'node:perf_hooks'
import { makeWorldInput, prodLandData, SHADMOT } from '../../src/test/livingLandFixtures'
import { buildWorld, makeWorldBuilder } from '../../src/world/world'

const runs = Number(process.argv.find((a) => a.startsWith('--runs='))?.slice(7) ?? 40)
const landData = prodLandData()
const baseInput = makeWorldInput(SHADMOT, '2026-11-17T06:00', null)
const fullInput = { ...baseInput, land: landData }
const hours = Array.from({ length: 16 }, (_, i) => `2026-11-17T${String(i + 6).padStart(2, '0')}:00` as const)

const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]
const fmt = (xs: number[]) => `median ${q(xs, 0.5).toFixed(2)} ms, p95 ${q(xs, 0.95).toFixed(2)} ms (n=${xs.length})`

for (let i = 0; i < 5; i++) { buildWorld(baseInput); buildWorld(fullInput) } // JIT warm-up

const coldBase: number[] = [], coldFull: number[] = [], refine: number[] = []
for (let i = 0; i < runs; i++) {
  let t = performance.now(); buildWorld(baseInput); coldBase.push(performance.now() - t)
  t = performance.now(); buildWorld(fullInput); coldFull.push(performance.now() - t)
  const b = makeWorldBuilder(); b(baseInput)
  t = performance.now(); b(fullInput); refine.push(performance.now() - t)
}

const scrubBase: number[] = [], scrubFull: number[] = []
for (let i = 0; i < Math.max(1, Math.floor(runs / 4)); i++) {
  const b0 = makeWorldBuilder(); b0(baseInput)
  const b1 = makeWorldBuilder(); b1(fullInput)
  for (const selected of hours) {
    let t = performance.now(); b0({ ...baseInput, selected }); scrubBase.push(performance.now() - t)
    t = performance.now(); b1({ ...fullInput, selected }); scrubFull.push(performance.now() - t)
  }
}

console.log(`buildWorld cold   (baseline, land=null): ${fmt(coldBase)}`)
console.log(`buildWorld cold   (100x100 + 60x60):     ${fmt(coldFull)}`)
console.log(`buildWorld refine (null -> 100x100+60):  ${fmt(refine)}`)
console.log(`buildWorld scrub  (baseline, land=null): ${fmt(scrubBase)}`)
console.log(`buildWorld scrub  (100x100 + 60x60):     ${fmt(scrubFull)}`)
