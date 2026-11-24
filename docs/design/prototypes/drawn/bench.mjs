// Cost of each layer's paint (CPU ×4, dpr 2.75, one thread), drawn concept against real on one machine, and how often a
// layer's form is unchanged between two steps of a time drag. On CI only:
//   node --experimental-strip-types docs/design/prototypes/drawn/bench.mjs <place>[@weather] …
import path from 'node:path'
import { launch, loadScene, openPage, root, sceneUrl, startServer } from '../../../../e2e/harness.mjs'
import { swapIn } from './swap.mjs'
import { kept, drag } from './benchPage.mjs'

const RATE = 4, DPR = 2.75, DAY = '2026-11-17'
const cases = process.argv.slice(2).map((text) => text.split('@'))
const p = (list, q) => [...list].sort((a, b) => a - b)[Math.max(0, Math.ceil(q * list.length) - 1)] ?? 0

/** The harness's scrub also leaves the model it painted. */
const expose = { name: 'bench-model', enforce: 'pre', transform: (code, id) => id.split('?')[0].endsWith('/dev/sceneHarness.tsx')
  ? code.replace('win.__world = next\n', 'win.__world = next\n        ;(win as any).__model = nextModel\n') : null }
const servers = {}
for (const as of ['real', 'concept'])
  servers[as] = await startServer(root, { plugins: [swapIn(as, root), expose], cacheDir: path.join(root, `.vite-bench-${as}`) })
const browser = await launch()

async function open(as, place, weather) {
  const { context, page } = await openPage(browser, servers[as].url, DPR)
  const cdp = await context.newCDPSession(page)
  await loadScene(page, sceneUrl(servers[as].url, { place, at: `${DAY}T06:00`, weather, style: as === 'real' ? '' : 'drawn', paint: 'main' }), 180000)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
  return { context, page, cdp }
}

/** Self time by function and file over a drag (no throttle: shares, not budgets). */
async function profile({ page, cdp }, span) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
  await cdp.send('Profiler.start')
  await page.evaluate(drag, span)
  const { profile: taken } = await cdp.send('Profiler.stop')
  const self = {}, total = taken.timeDeltas.reduce((a, b) => a + b, 0)
  const name = Object.fromEntries(taken.nodes.map(({ id, callFrame: f }) => [id,
    `${f.functionName || '(anonymous)'} ${path.basename(f.url.split('?')[0])}:${f.lineNumber + 1}`]))
  taken.samples.forEach((id, i) => { self[name[id]] = (self[name[id]] ?? 0) + taken.timeDeltas[i] })
  return Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 45)
    .map(([k, us]) => `${(us / 1000 / (span.count - 1)).toFixed(2).padStart(8)} ms ${(100 * us / total).toFixed(1).padStart(5)} %  ${k}`)
}

try {
  // Both module graphs warm before anything is timed.
  for (const as of ['real', 'concept', 'real', 'concept']) await (await open(as, 'haifa', '')).context.close()
  for (const [place, weather = ''] of cases) {
    const all = { real: {}, concept: {} }
    for (const as of ['real', 'concept', 'concept', 'real']) {
      const o = await open(as, place, weather)
      await o.page.evaluate(drag, { day: DAY, from: 348, count: 3, step: 6 })
      for (const [from, count, step] of [[360, 25, 30], [720, 13, 5]])
        for (const [id, list] of Object.entries(await o.page.evaluate(drag, { day: DAY, from, count, step }))) (all[as][id] ??= []).push(...list)
      await o.context.close()
    }
    console.log(`\n## ${place} ${weather}  ms a paint: p50 / p95 (paints)      real | concept`)
    const ids = [...new Set([...Object.keys(all.real), ...Object.keys(all.concept)])]
    const cell = (list = []) => `${p(list, 0.5).toFixed(0).padStart(5)} /${p(list, 0.95).toFixed(0).padStart(5)} (${String(list.length).padStart(3)})`
    for (const id of ids.sort((a, b) => p(all.concept[b] ?? [], 0.5) - p(all.concept[a] ?? [], 0.5)))
      console.log(`${id.padEnd(28)} ${cell(all.real[id])} | ${cell(all.concept[id])}`)
    const o = await open('concept', place, weather)
    for (const step of [1, 5, 30])
      console.log(`form unchanged, ${step} min steps: ${(await o.page.evaluate(kept, { day: DAY, from: 600, count: 13, step })).join('; ')}`)
    console.log(`self time a step, concept, no throttle:\n${(await profile(o, { day: DAY, from: 480, count: 17, step: 30 })).join('\n')}`)
    await o.context.close()
  }
} finally {
  await browser.close()
  for (const server of Object.values(servers)) await server.close()
}
