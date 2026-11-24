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

/** A layer's paint is timed with its raster: its canvases (the beam's and the shade's) are read back once it is painted. */
const flush = { name: 'bench-flush', enforce: 'pre', transform: (code, id) => id.split('?')[0].endsWith('/compose/paintJob.ts')
  ? code.replace('export function paintPart(', 'export function paintPart(...args: Parameters<typeof paintInto>) {\n  paintInto(...args)\n  args[0].getImageData(0, 0, 1, 1)\n}\n\nfunction paintInto(') : null }

/** The harness's scrub also leaves the model it painted. */
const expose = { name: 'bench-model', enforce: 'pre', transform: (code, id) => id.split('?')[0].endsWith('/dev/sceneHarness.tsx')
  ? code.replace('win.__world = next\n', 'win.__world = next\n        ;(win as any).__model = nextModel\n') : null }
const servers = {}
for (const as of ['real', 'concept'])
  servers[as] = await startServer(root, { plugins: [swapIn(as, root), expose, flush], cacheDir: path.join(root, `.vite-bench-${as}`) })
const browser = await launch()

async function open(as, place, weather) {
  const { context, page } = await openPage(browser, servers[as].url, DPR)
  const cdp = await context.newCDPSession(page)
  await loadScene(page, sceneUrl(servers[as].url, { place, at: `${DAY}T06:00`, weather, style: as === 'real' ? '' : 'drawn', paint: 'main' }), 180000)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
  return { context, page, cdp }
}

/** Self time by function, and the two callers of our own over it, over a drag (no throttle: shares, not budgets). */
async function profile({ page, cdp }, span) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
  await cdp.send('Profiler.start')
  await page.evaluate(drag, span)
  const { profile: taken } = await cdp.send('Profiler.stop')
  const self = {}, total = taken.timeDeltas.reduce((a, b) => a + b, 0)
  const at = new Map(), parent = new Map()
  for (const node of taken.nodes) { at.set(node.id, node); for (const child of node.children ?? []) parent.set(child, node.id) }
  const label = ({ callFrame: f }) => `${f.functionName || '()'} ${path.basename(f.url.split('?')[0])}`
  const name = Object.fromEntries(taken.nodes.map(({ id, callFrame: f }) => [id, `${f.functionName || '()'} ${path.basename(f.url.split('?')[0])}:${f.lineNumber + 1}`]))
  const callers = (id) => {
    const out = []
    for (let up = parent.get(id); up !== undefined && out.length < 2; up = parent.get(up)) if (at.get(up).callFrame.url) out.push(label(at.get(up)))
    return out
  }
  taken.samples.forEach((id, i) => { const key = [name[id], ...callers(id)].join(' < '); self[key] = (self[key] ?? 0) + taken.timeDeltas[i] })
  return Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 40)
    .map(([k, us]) => `${(us / 1000 / (span.count - 1)).toFixed(2).padStart(8)} ms ${(100 * us / total).toFixed(1).padStart(5)} %  ${k}`)
}

try {
  // Both module graphs warm before anything is timed.
  for (const as of ['real', 'concept', 'real', 'concept']) await (await open(as, 'haifa', '')).context.close()
  for (const [place, weather = ''] of cases) {
    const all = { real: {}, concept: {} }, sums = { real: [], concept: [] }
    for (const as of ['real', 'concept', 'concept', 'real']) {
      const o = await open(as, place, weather)
      await o.page.evaluate(drag, { day: DAY, from: 348, count: 3, step: 6 })
      for (const [from, count, step] of [[360, 25, 30], [720, 13, 5]])
        for (const paints of await o.page.evaluate(drag, { day: DAY, from, count, step })) {
          for (const [id, ms] of Object.entries(paints)) (all[as][id] ??= []).push(ms)
          sums[as].push(Object.values(paints).reduce((a, b) => a + b, 0))
        }
      await o.context.close()
    }
    console.log(`\n## ${place} ${weather}  ms a paint: p50 / p95 (paints)      real | concept`)
    const cell = (list = []) => `${p(list, 0.5).toFixed(0).padStart(5)} /${p(list, 0.95).toFixed(0).padStart(5)} (${String(list.length).padStart(3)})`
    console.log(`${'a step, every layer'.padEnd(28)} ${cell(sums.real)} | ${cell(sums.concept)}`)
    const ids = [...new Set([...Object.keys(all.real), ...Object.keys(all.concept)])]
    for (const id of ids.filter((id) => !/^(birds|aircraft|twinkle)/.test(id)).sort((a, b) => p(all.concept[b] ?? [], 0.5) - p(all.concept[a] ?? [], 0.5)))
      console.log(`${id.padEnd(28)} ${cell(all.real[id])} | ${cell(all.concept[id])}`)
    for (const as of ['real', 'concept']) {
      const o = await open(as, place, weather)
      if (as === 'concept') for (const [from, count, step] of [[600, 13, 1], [780, 13, 1], [900, 13, 1], [600, 13, 5], [780, 13, 5], [360, 25, 30]])
        console.log(`form unchanged from minute ${from}, ${step} min steps: ${(await o.page.evaluate(kept, { day: DAY, from, count, step })).join('; ')}`)
      console.log(`self time a step, ${as}, no throttle:\n${(await profile(o, { day: DAY, from: 480, count: 17, step: 30 })).join('\n')}`)
      await o.context.close()
    }
  }
} finally {
  await browser.close()
  for (const server of Object.values(servers)) await server.close()
}
