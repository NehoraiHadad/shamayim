// Performance of the canvas scene (docs/design/CANVAS-SCENE-PLAN.md §3, performance budget), in Chromium with the CPU
// throttled ×4 (CDP Emulation.setCPUThrottlingRate) at the reference phone's dpr (2.75): a cold load, 60 scrub frames
// across the day and, once a layer animates (C6–C8), 10 s of animation. Prints p50 / p95 per step and fails a gated
// step above 1.5 × its budget.
<<<<<<< HEAD
//   npm run test:perf [-- --place=haifa] [-- --rate=4] [-- --gpu]
// The animation (C6: the clouds drifting, lightning, shimmer) is measured on its own page with motion on, at a stormy
// hour (`thunder`: every cloud layer drifting and flashes in the raining banks); the cold load and the scrub frames on a
// page with reduced motion, so no loop races them.
=======
// With the paint worker (the default where the browser has one) the main thread only asks for layers and lays the bitmaps
// it gets back: a step's time is the main thread's (asking, laying each arrival), and the wait for the worker is
// reported beside it (`firstShown`, `scrub.latency`). `--paint=main` keeps the painting on the main thread to compare.
//   npm run test:perf [-- --place=haifa] [-- --rate=4] [-- --gpu] [-- --paint=main]
>>>>>>> origin/ccr-85ec24f0-9ayxgu
import { launch, loadScene, openPage, sceneUrl, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const places = arg('place', 'haifa,tel-aviv,shadmot-mehola').split(',')
const rate = Number(arg('rate', 4))
const paintMain = arg('paint', 'worker') === 'main'
const DPR = 2.75
const SLACK = 1.5

/** Budgets (ms; memory MB). `gate: false` is reported only (see the plan's §6 for why). */
const BUDGET = {
  // The cold world holds the marks (hillScene) until C4 rewrites them (C0's §6 note); the hour's rebuild while scrubbing
  // is reported with it.
  worldCold: { ms: 15, gate: false },
  modelCold: { ms: 10, gate: true },
  firstPaint: { ms: 60, gate: true },
  // Until every layer shows (the worker's wait included): reported.
  firstShown: { ms: 60, gate: false },
  // A 2D canvas defers raster to the first blit, so a cold slice holds at least one layer's whole raster: one
  // full-surface layer is over 8 ms in software raster ×4. Reported, not gated, until C6/C9 (the plan's §6).
  'slice.land': { ms: 8, gate: false },
  'slice.sky': { ms: 8, gate: false },
  // A scrub frame on the land: its light canvases only.
  'scrub.land': { ms: 10, gate: true },
  // C6: the sky's base is the canvas's CSS background; a scrub frame repaints the bodies, the stars and the clouds.
  'scrub.sky': { ms: 10, gate: true },
  'scrub.world': { ms: 10, gate: false },
  // From a scrub frame's ask until its light shows (the worker's wait): reported. 33 ms (two frames at 60 Hz) is a
  // proposal, not in the plan's §3 table.
  'scrub.latency': { ms: 33, gate: false },
  'scrub.model': { ms: 10, gate: true },
  anim: { ms: 4, gate: true },
  memory: { mb: 48, gate: true },
}

const q = (list, p) => {
  const sorted = [...list].sort((a, b) => a - b)
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))] : NaN
}

const server = await startServer()
const gpu = args.includes('--gpu')
const browser = await launch({ gpu })
const failures = []
try {
  // Warm Vite's module graph so the first measured load is the scene's, not the server's.
  const warm = await openPage(browser, server.url, 1)
  await loadScene(warm.page, sceneUrl(server.url, { place: 'haifa', at: '2026-11-17T12:00' }))
  await warm.context.close()
  for (const place of places) {
    const { context, page } = await openPage(browser, server.url, DPR)
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate })
    const url = sceneUrl(server.url, { place, at: '2026-11-17T06:00' }) + (paintMain ? '&paint=main' : '')
    await loadScene(page, url, 180000)
    const offThread = await page.evaluate(() => window.__scene.offThread)
    const cold = await page.evaluate(() => {
      const s = window.__sceneStats
      return { steps: s.steps, memory: Object.values(s.memory).reduce((a, b) => a + b, 0) }
    })
    // A scrub frame: the synchronous frame (world, model, paint or ask, composite) and, with the worker, the main thread's
    // time laying what arrived before the next frame.
    const { frames: scrub, latency } = await page.evaluate(async () => {
      const steps = window.__sceneStats.steps
      const since = (name, from) => (steps[name] ?? []).slice(from).reduce((a, b) => a + b, 0)
      const frames = []
      const latency0 = steps['latency.land']?.length ?? 0
      for (let i = 1; i <= 60; i++) {
        const minutes = 6 * 60 + i * 12
        const at = `2026-11-17T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
        const n = { land: steps['arrive.land']?.length ?? 0, sky: steps['arrive.sky']?.length ?? 0 }
        const frame = window.__scene.scrub(at)
        await new Promise((r) => requestAnimationFrame(() => r()))
        frames.push({ ...frame, land: frame.land + since('arrive.land', n.land), sky: frame.sky + since('arrive.sky', n.sky) })
      }
      await window.__scene.settled()
      return { frames, latency: (steps['latency.land'] ?? []).slice(latency0) }
    })
    const memoryAfter = await page.evaluate(() => window.__sceneStats.memory)
    const layerMs = await page.evaluate(() => Object.entries(window.__sceneStats.layers)
      .map(([id, l]) => `${id} ${l.lastMs.toFixed(1)}`).join(', '))
    const workerMs = await page.evaluate(() => ['sky', 'land'].map((name) => [name, window.__sceneStats.steps[`worker.${name}`] ?? []]))
    const firstPaint = (cold.steps['firstPaint.sky']?.[0] ?? 0) + (cold.steps['firstPaint.land']?.[0] ?? 0)
    // The two surfaces' workers paint side by side: every layer shows when the later one is done.
    const firstShown = offThread ? Math.max(cold.steps['firstShown.sky']?.[0] ?? 0, cold.steps['firstShown.land']?.[0] ?? 0) : firstPaint
    const repainted = [...new Set(scrub.flatMap((f) => f.painted))].sort()
    const rows = {
      worldCold: cold.steps.worldCold ?? [],
      modelCold: cold.steps.modelCold ?? [],
      firstPaint: [firstPaint],
      firstShown: [firstShown],
      'slice.land': cold.steps['slice.land'] ?? [],
      'slice.sky': cold.steps['slice.sky'] ?? [],
      'scrub.world': scrub.map((f) => f.world),
      'scrub.model': scrub.map((f) => f.model),
      'scrub.land': scrub.map((f) => f.land),
      'scrub.sky': scrub.map((f) => f.sky),
      ...(offThread ? { 'scrub.latency': latency } : {}),
    }
    console.log(`\n${place}  (CPU ×${rate}, dpr ${DPR}, ${gpu ? 'GPU raster (SwiftShader)' : 'software raster'}, painted ${offThread ? 'in the worker' : 'on the main thread'})`)
    for (const [step, list] of Object.entries(rows)) {
      // The cold slices are the main thread's painting: none with the worker.
      if (!list.length) continue
      const budget = BUDGET[step]
      const p50 = q(list, 0.5), p95 = q(list, 0.95)
      const over = budget.gate && p95 > budget.ms * SLACK
      if (over) failures.push(`${place} ${step} p95 ${p95.toFixed(1)} ms > ${(budget.ms * SLACK).toFixed(1)}`)
      console.log(`  ${step.padEnd(12)} p50 ${p50.toFixed(2).padStart(7)}  p95 ${p95.toFixed(2).padStart(7)} ms  (n ${String(list.length).padStart(2)}, budget ${budget.ms}${budget.gate ? '' : ', reported only'})${over ? '  OVER' : ''}`)
    }
    const mb = Object.values(memoryAfter).reduce((a, b) => a + b, 0) / 2 ** 20
    if (mb > BUDGET.memory.mb * SLACK) failures.push(`${place} memory ${mb.toFixed(1)} MB`)
    console.log(`  memory       ${mb.toFixed(1)} MB (budget ${BUDGET.memory.mb})`)
    console.log(`  scrub repainted: ${repainted.join(', ') || 'nothing'}`)
<<<<<<< HEAD
    console.log(`  last paint per layer (ms): ${layerMs}`)
=======
    if (offThread) {
      console.log(`  worker batch (ms, the worker's own time, raster included): ${workerMs.map(([name, list]) =>
        `${name} p50 ${q(list, 0.5).toFixed(1)} p95 ${q(list, 0.95).toFixed(1)} (n ${list.length})`).join(', ')}`)
    } else console.log(`  last paint per layer (ms): ${layerMs}`)
    console.log('  anim         no animated layer yet (C6–C8)')
>>>>>>> origin/ccr-85ec24f0-9ayxgu
    await context.close()
    // The sky's animation: 10 s at a stormy hour with the loop running.
    const moving = await openPage(browser, server.url, DPR, { motion: true })
    const cdp2 = await moving.context.newCDPSession(moving.page)
    await cdp2.send('Emulation.setCPUThrottlingRate', { rate })
    await loadScene(moving.page, sceneUrl(server.url, { place, at: '2026-11-17T12:00', weather: 'thunder' }), 180000)
    await moving.page.evaluate(() => { window.__sceneStats.steps['anim.sky'] = [] })
    await moving.page.waitForTimeout(10000)
    const anim = await moving.page.evaluate(() => window.__sceneStats.steps['anim.sky'] ?? [])
    const a50 = q(anim, 0.5), a95 = q(anim, 0.95)
    const overAnim = a95 > BUDGET.anim.ms * SLACK
    if (overAnim) failures.push(`${place} anim p95 ${a95.toFixed(1)} ms > ${(BUDGET.anim.ms * SLACK).toFixed(1)}`)
    console.log(`  anim.sky     p50 ${a50.toFixed(2).padStart(7)}  p95 ${a95.toFixed(2).padStart(7)} ms  (n ${anim.length}, 10 s, thunder; budget ${BUDGET.anim.ms})${overAnim ? '  OVER' : ''}`)
    await moving.context.close()
  }
} finally {
  await browser.close()
  await server.close()
}
if (failures.length) {
  console.log(`\nOVER BUDGET (×${SLACK}):\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('\nwithin budget')
