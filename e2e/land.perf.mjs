// Intercepted App-mount living-land performance check: measures first fallback canvas paint while
// recorded satellite replies are delayed, refinement on production-sized 100×100 S2 + 60×60 GIBS
// grids, same-day App hour scrub (asserting `world.land` reuse), and cold-mount single fine-tile fetch.
//   node e2e/land.perf.mjs [--rate=4] [--gpu] [--dense] [--preview]
//   node e2e/land.perf.mjs --baseline-root=<built Stage 3 checkout> [--runs=3]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, root, startPreview, startServer } from './harness.mjs'
import { interceptLandPerf } from './landPerfRoutes.mjs'

const SHADMOT = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }

export async function runAppLandPerf(browser, serverUrl, { rate = 4, dpr = 2.75, dense = false } = {}) {
  const panorama = fs.readFileSync(path.join(root, 'src/test/fixtures/scene/shadmot-mehola.panorama.json'), 'utf8')
  const { context, releaseLand, fineTileFetches } = await interceptLandPerf(browser, serverUrl, { dpr, dense, panorama })

  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
  await page.addInitScript(({ place, panorama, at }) => {
    window.__trackSceneShown = true
    localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
    localStorage.setItem(`shamayim:horizon:v3:${place.id}`, panorama)
    const R = Date, off = R.parse(at) - R.now()
    class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
    window.Date = S
  }, { place: SHADMOT, panorama, at: '2026-11-17T12:00:00+02:00' })

  const tNav = performance.now()
  await page.goto(`${serverUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  // 1. First fallback canvas paint MUST composite fresh `plane.near` and `plane.far` (never satisfied by C8 mist)
  await page.waitForFunction((dense) => {
    const shown = window.__sceneStats?.shown
    return Boolean(document.querySelector('figure[data-canvas]') && window.__world?.terrain?.status === 'ready'
      && window.__world?.land && (!dense || window.__world.land.own.cover === 1)
      && shown?.['plane.near']?.fresh && shown?.['plane.far']?.fresh)
  }, dense, { timeout: 60000 })
  const firstFallbackPaintMs = performance.now() - tNav
  const fallbackSnap = await page.evaluate(() => ({
    albedoSource: window.__world.land.own.albedoSource,
    nearKey: window.__sceneStats.shown['plane.near'].key,
    farKey: window.__sceneStats.shown['plane.far'].key,
  }))

  // 2. Release delayed S2 + GIBS NDVI + GIBS SR RGB replies and wait for refined `plane.near` & `plane.far` composites
  const tRelease = performance.now()
  releaseLand()
  await page.waitForFunction(({ nearKey, farKey }) => {
    const l = window.__world?.land
    const far20 = l?.rays?.[20]?.bands?.find((b) => b.distanceM === 20_000)?.sample
    const shown = window.__sceneStats?.shown
    return Boolean(
      l?.own?.albedoSource?.startsWith('s2:2026-11-15')
      && far20?.ndviSource?.startsWith('gibs:')
      && far20?.albedoSource?.startsWith('gibs:2026-11-01')
      && shown?.['plane.near']?.fresh && shown['plane.near'].key !== nearKey
      && shown?.['plane.far']?.fresh && shown['plane.far'].key !== farKey,
    )
  }, { nearKey: fallbackSnap.nearKey, farKey: fallbackSnap.farKey }, { timeout: 60000 })
  const refinementMs = performance.now() - tRelease
  const refinedMeta = await page.evaluate(() => {
    const far20 = window.__world.land.rays[20].bands.find((b) => b.distanceM === 20_000)?.sample
    // 55 km due south of Shadmot (~31.85°N) lies in tile 8/104/153 (outside the recorded 8/103/153 tile).
    const far55 = window.__world.land.rays[20].bands.find((b) => b.distanceM >= 50_000)?.sample
    return {
      ownAlbedo: window.__world.land.own.albedoSource,
      ownCover: window.__world.land.own.coverSource,
      farNdvi: far20?.ndviSource,
      farAlbedo: far20?.albedoSource,
      farMissAlbedo: far55?.albedoSource,
      nearKey: window.__sceneStats.shown['plane.near'].key,
      farKey: window.__sceneStats.shown['plane.far'].key,
    }
  })

  // 3. Same-UTC-day hour scrub via App slider: time press -> fresh light composite (n=30, form & world.land reused)
  const slider = page.locator('[role="slider"][aria-label="שעה בעמק"]')
  await slider.focus()
  await page.evaluate(() => { window.__landRef0 = window.__world.land })
  const scrubSteps = []
  let reused = true, formReused = true
  for (let i = 0; i < 30; i++) {
    const key = Math.floor(i / 5) % 2 === 0 ? 'ArrowLeft' : 'ArrowRight'
    const prev = await page.evaluate(() => ({
      at: window.__world.at,
      nearLight: window.__sceneStats.shown['plane.near']?.lightKey ?? null,
      farLight: window.__sceneStats.shown['plane.far']?.lightKey ?? null,
    }))
    const t0 = performance.now()
    await page.keyboard.press(key)
    await page.waitForFunction(({ at, nearLight, farLight, nearForm, farForm }) => {
      const s = window.__sceneStats?.shown
      return window.__world?.at !== at
        && s?.['plane.near']?.fresh && s['plane.near'].key === nearForm && s['plane.near'].lightKey !== nearLight
        && s?.['plane.far']?.fresh && s['plane.far'].key === farForm && s['plane.far'].lightKey !== farLight
    }, { ...prev, nearForm: refinedMeta.nearKey, farForm: refinedMeta.farKey }, { timeout: 15000 })
    scrubSteps.push(performance.now() - t0)
    const ok = await page.evaluate(({ nearForm, farForm }) => ({
      land: window.__world.land === window.__landRef0,
      form: window.__sceneStats.shown['plane.near']?.key === nearForm && window.__sceneStats.shown['plane.far']?.key === farForm,
    }), { nearForm: refinedMeta.nearKey, farForm: refinedMeta.farKey })
    if (!ok.land) reused = false
    if (!ok.form) formReused = false
  }
  const cover = await page.evaluate(() => window.__world.land.own.cover)
  await context.close()

  const duplicateTiles = [...fineTileFetches.entries()].filter(([, n]) => n > 1)
  const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  console.log(`\napp living-land mount (shadmot-mehola${dense ? ', dense tree cover' : ''}, CPU ×${rate}, dpr ${dpr}, 100×100 S2 + 60×60 GIBS NDVI+SR intercepted)`)
  console.log(`  firstFallbackPaint ${firstFallbackPaintMs.toFixed(1)} ms  (albedoSource=${fallbackSnap.albedoSource}, plane.near=${fallbackSnap.nearKey}, satellite held)`)
  console.log(`  refinement         ${refinementMs.toFixed(1)} ms  (own=${refinedMeta.ownAlbedo}, cover=${refinedMeta.ownCover}, far20km ndvi=${refinedMeta.farNdvi} albedo=${refinedMeta.farAlbedo}, far55km(miss)=${refinedMeta.farMissAlbedo}, plane.near=${refinedMeta.nearKey}, plane.far=${refinedMeta.farKey})`)
  console.log(`  sameDayScrubLight  p50 ${med(scrubSteps).toFixed(1)} ms  (n=${scrubSteps.length}, world.land reused=${reused}, form reused=${formReused})`)
  console.log(`  coldFineTiles      ${fineTileFetches.size} unique tiles fetched, duplicates=${duplicateTiles.length}`)

  const problems = []
  if (dense && cover !== 1) problems.push(`dense fixture resolved to cover=${cover} (expected 1)`)
  if (fallbackSnap.albedoSource !== 'climatology') problems.push(`first paint albedoSource=${fallbackSnap.albedoSource} (expected climatology)`)
  if (!refinedMeta.farAlbedo?.startsWith('gibs:2026-11-01')) problems.push(`far albedoSource=${refinedMeta.farAlbedo} (expected gibs:2026-11-01*)`)
  // The dense tile removes the missing tile's cover class from the valid near-S2 means.
  const expectedMiss = dense ? 'climatology' : 's2-mean:2026-11-15+climatology'
  if (refinedMeta.farMissAlbedo !== expectedMiss) {
    problems.push(`missing-tile far55km albedoSource=${refinedMeta.farMissAlbedo} (expected ${expectedMiss})`)
  }
  if (refinedMeta.nearKey === fallbackSnap.nearKey) problems.push('plane.near form key did not update on refinement')
  if (refinedMeta.farKey === fallbackSnap.farKey) problems.push('plane.far form key did not update on refinement')
  if (!reused) problems.push('same-day scrub rebuilt world.land')
  if (!formReused) problems.push('same-day scrub repainted plane form')
  if (duplicateTiles.length) problems.push(`duplicate cold fine-tile fetches: ${duplicateTiles.map(([k, n]) => `${k}×${n}`).join(', ')}`)
  return { firstFallbackPaintMs, refinementMs, scrubMedianMs: med(scrubSteps), reused, duplicateTiles, problems }
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
    const cases = baselineServer ? [false, true] : [args.includes('--dense')]
    for (const dense of cases) for (let i = 0; i < (baselineServer ? runs : 1); i++) {
      const stages = baselineServer ? [['stage3', baselineServer], ['stage4', server]] : [['app', server]]
      if (i % 2 === 1) stages.reverse()
      for (const [name, app] of stages) {
        console.log(`\n${name} / run ${i + 1}`)
        const res = await runAppLandPerf(browser, app.url, { rate, dense })
        if (res.problems.length) { console.error(`FAIL: ${res.problems.join('; ')}`); process.exitCode = 1 }
      }
    }
  } finally {
    await browser.close()
    if (baselineServer) await baselineServer.close()
    await server.close()
  }
}
