// Intercepted App-mount living-land performance check: measures first fallback canvas paint while
// recorded satellite replies are delayed, refinement on production-sized 100×100 S2 + 60×60 GIBS
// grids, same-day App hour scrub (asserting `world.land` reuse), and cold-mount single fine-tile fetch.
//   node e2e/land.perf.mjs [--rate=4] [--gpu] [--dense] [--windy] [--preview]
//   node e2e/land.perf.mjs --baseline-root=<built Stage 4 checkout> [--windy] [--runs=3]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, root, startPreview, startServer } from './harness.mjs'
import { measureAppLand, median } from './landPerfMeasure.mjs'
import { interceptLandPerf } from './landPerfRoutes.mjs'

export async function runAppLandPerf(browser, serverUrl, { rate = 4, dpr = 2.75, dense = false, windy = false } = {}) {
  const panorama = fs.readFileSync(path.join(root, 'src/test/fixtures/scene/shadmot-mehola.panorama.json'), 'utf8')
  const { context, releaseLand, fineTileFetches, assetDeadlines } = await interceptLandPerf(browser, serverUrl, { dpr, dense, windy, panorama })
  try {
    return await measureAppLand(context, serverUrl, { rate, dpr, dense, windy, panorama, releaseLand, fineTileFetches, assetDeadlines })
  } catch (error) {
    const note = assetDeadlines.size ? `local land asset deadline aborts: ${[...assetDeadlines].sort().join(', ')}` : 'fixture error'
    return { problems: [`${note} (${error.message.split('\n')[0]})`] }
  } finally {
    await context.close()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const rate = Number(args.find((a) => a.startsWith('--rate='))?.slice(7) ?? 4)
  const gpu = args.includes('--gpu')
  const baselineRoot = args.find((a) => a.startsWith('--baseline-root='))?.slice('--baseline-root='.length)
  const runs = Number(args.find((a) => a.startsWith('--runs='))?.slice(7) ?? 3)
  const server = await (baselineRoot || args.includes('--preview') ? startPreview() : startServer())
  const baselineServer = baselineRoot && await startPreview(baselineRoot)
  const browser = await launch({ gpu })
  try {
    const cases = baselineServer
      ? (args.includes('--windy') ? [{ dense: true, windy: true }] : [{ dense: false, windy: false }, { dense: true, windy: false }, { dense: true, windy: true }])
      : [{ dense: args.includes('--dense'), windy: args.includes('--windy') }]
    for (const cfg of cases) {
      const stats = { base: [], head: [] }
      for (let i = 0; i < (baselineServer ? runs : 1); i++) {
        // Both revisions use identical terrain-milestone triggers (no extra waits on head).
        const stages = baselineServer ? [['base', baselineServer], ['head', server]] : [['app', server]]
        if (i % 2 === 1) stages.reverse()
        for (const [name, app] of stages) {
          console.log(`\n${name} / run ${i + 1}`)
          const res = await runAppLandPerf(browser, app.url, { rate, ...cfg })
          if (name === 'base' || name === 'head') stats[name].push(res)
          if (res.problems.length) { console.error(`FAIL: ${res.problems.join('; ')}`); process.exitCode = 1 }
        }
      }
      if (baselineServer && stats.base.length && stats.head.length) {
        const fmt = (list, key) => {
          const vals = list.map((r) => r[key]).filter((v) => typeof v === 'number')
          return vals.length ? `${vals.map((v) => v.toFixed(1)).join(' / ')} (med ${median(vals).toFixed(1)} ms)` : 'n/a'
        }
        console.log(`\nSUMMARY (dense=${cfg.dense}, windy=${cfg.windy}, runs=${runs}):`)
        for (const key of ['firstFallbackPaintMs', 'refinementMs', 'scrubMedianMs']) {
          console.log(`  ${key.padEnd(20)} base: ${fmt(stats.base, key)}  |  head: ${fmt(stats.head, key)}`)
        }
      }
    }
  } finally {
    await browser.close()
    if (baselineServer) await baselineServer.close()
    await server.close()
  }
}
