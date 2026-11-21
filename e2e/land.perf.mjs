// Intercepted App-mount living-land performance check: measures first fallback canvas paint while
// recorded satellite replies are delayed, refinement on production-sized 100×100 S2 + 60×60 GIBS
// grids, same-day App hour scrub (asserting `world.land` reuse), and cold-mount single fine-tile fetch.
//   node e2e/land.perf.mjs [--rate=4] [--gpu]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch, root, startServer } from './harness.mjs'
import { buildGibsNdviPng, buildRecordedS2Fixture, fulfillRange, loadGibsSrJpeg } from './landFixtures.mjs'

const SHADMOT = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }

export async function runAppLandPerf(browser, serverUrl, { rate = 4, dpr = 2.75 } = {}) {
  const host = new URL(serverUrl).host
  const panorama = fs.readFileSync(path.join(root, 'src/test/fixtures/scene/shadmot-mehola.panorama.json'), 'utf8')
  const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
  forecast.elevation = JSON.parse(panorama).groundM
  const [{ stac, cogs }, gibsPng, gibsSrJpg] = await Promise.all([
    buildRecordedS2Fixture(root), Promise.resolve(buildGibsNdviPng(root)), Promise.resolve(loadGibsSrJpeg(root)),
  ])

  let releaseLand
  const landGate = new Promise((r) => { releaseLand = r })
  const fineTileFetches = new Map()
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: dpr, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (/\/v1\/forecast$/.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) })
    }
    if (url.host === 'earth-search.aws.element84.com') {
      await landGate
      return route.fulfill({ status: 200, contentType: 'application/json', body: stac, headers: { 'Access-Control-Allow-Origin': '*' } })
    }
    if (url.host === 'recorded.s2.test') {
      const buf = cogs[path.basename(url.pathname)]
      return buf ? fulfillRange(route, buf, 'image/tiff') : route.fulfill({ status: 404 })
    }
    if (url.host === 'gibs.earthdata.nasa.gov' && url.pathname.includes('MODIS_Terra_NDVI_8Day')) {
      await landGate
      return route.fulfill({ status: 200, contentType: 'image/png', body: gibsPng, headers: { 'Access-Control-Allow-Origin': '*' } })
    }
    if (url.host === 'gibs.earthdata.nasa.gov' && url.pathname.includes('MODIS_Terra_L3_SurfaceReflectance_Bands143_8Day')) {
      await landGate
      // Serve the genuine recorded 2026-11-01 tile ONLY at its exact tile address (8/103/153); 404 elsewhere.
      return /\/2026-11-01\/[^/]+\/8\/103\/153\.jpeg$/.test(url.pathname)
        ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: gibsSrJpg, headers: { 'Access-Control-Allow-Origin': '*' } })
        : route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' } })
    }
    if (url.host === host) {
      if (/\/data\/land\/il\/\d+_\d+\.json$/.test(url.pathname)) {
        const key = path.basename(url.pathname)
        fineTileFetches.set(key, (fineTileFetches.get(key) ?? 0) + 1)
      }
      return route.continue()
    }
    return route.abort('blockedbyclient')
  })

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
  await page.goto(`${serverUrl}/`)
  // 1. First fallback canvas paint MUST composite fresh `plane.near` and `plane.far` (never satisfied by C8 mist)
  await page.waitForFunction(() => {
    const shown = window.__sceneStats?.shown
    return Boolean(document.querySelector('figure[data-canvas]') && window.__world?.terrain?.status === 'ready'
      && window.__world?.land && shown?.['plane.near']?.fresh && shown?.['plane.far']?.fresh)
  }, null, { timeout: 60000 })
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

  // 3. Same-UTC-day hour scrub via real App slider: assert `world.land` reference is reused on every step
  const slider = page.locator('[role="slider"][aria-label="שעה בעמק"]')
  await slider.focus()
  await page.evaluate(() => { window.__landRef0 = window.__world.land })
  const scrubSteps = []
  let reused = true
  for (let i = 0; i < 8; i++) {
    const beforeAt = await page.evaluate(() => window.__world.at)
    const t0 = performance.now()
    await page.keyboard.press('ArrowLeft')
    await page.waitForFunction((prev) => window.__world?.at !== prev, beforeAt, { timeout: 15000 })
    scrubSteps.push(performance.now() - t0)
    if (!(await page.evaluate(() => window.__world.land === window.__landRef0))) reused = false
  }
  await context.close()

  const duplicateTiles = [...fineTileFetches.entries()].filter(([, n]) => n > 1)
  const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  console.log(`\napp living-land mount (shadmot-mehola, CPU ×${rate}, dpr ${dpr}, 100×100 S2 + 60×60 GIBS NDVI+SR intercepted)`)
  console.log(`  firstFallbackPaint ${firstFallbackPaintMs.toFixed(1)} ms  (albedoSource=${fallbackSnap.albedoSource}, plane.near=${fallbackSnap.nearKey}, satellite held)`)
  console.log(`  refinement         ${refinementMs.toFixed(1)} ms  (own=${refinedMeta.ownAlbedo}, cover=${refinedMeta.ownCover}, far20km ndvi=${refinedMeta.farNdvi} albedo=${refinedMeta.farAlbedo}, far55km(miss)=${refinedMeta.farMissAlbedo}, plane.near=${refinedMeta.nearKey}, plane.far=${refinedMeta.farKey})`)
  console.log(`  sameDayScrub       p50 ${med(scrubSteps).toFixed(1)} ms  (n=${scrubSteps.length}, world.land reused=${reused})`)
  console.log(`  coldFineTiles      ${fineTileFetches.size} unique tiles fetched, duplicates=${duplicateTiles.length}`)

  const problems = []
  if (fallbackSnap.albedoSource !== 'climatology') problems.push(`first paint albedoSource=${fallbackSnap.albedoSource} (expected climatology)`)
  if (!refinedMeta.farAlbedo?.startsWith('gibs:2026-11-01')) problems.push(`far albedoSource=${refinedMeta.farAlbedo} (expected gibs:2026-11-01*)`)
  if (refinedMeta.farMissAlbedo !== 's2-mean:2026-11-15+climatology') {
    problems.push(`missing-tile far55km albedoSource=${refinedMeta.farMissAlbedo} (expected s2-mean:2026-11-15+climatology)`)
  }
  if (refinedMeta.nearKey === fallbackSnap.nearKey) problems.push('plane.near form key did not update on refinement')
  if (refinedMeta.farKey === fallbackSnap.farKey) problems.push('plane.far form key did not update on refinement')
  if (!reused) problems.push('same-day scrub rebuilt world.land')
  if (duplicateTiles.length) problems.push(`duplicate cold fine-tile fetches: ${duplicateTiles.map(([k, n]) => `${k}×${n}`).join(', ')}`)
  return { firstFallbackPaintMs, refinementMs, scrubMedianMs: med(scrubSteps), reused, duplicateTiles, problems }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const rate = Number(args.find((a) => a.startsWith('--rate='))?.slice(7) ?? 4)
  const gpu = args.includes('--gpu')
  const server = await startServer()
  const browser = await launch({ gpu })
  try {
    const res = await runAppLandPerf(browser, server.url, { rate })
    if (res.problems.length) { console.error(`FAIL: ${res.problems.join('; ')}`); process.exit(1) }
  } finally {
    await browser.close()
    await server.close()
  }
}
