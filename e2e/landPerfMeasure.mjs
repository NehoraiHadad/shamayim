// App-mount living-land measurement & reporting (shared by single runs and matched base/head pairs).
// Both revisions advance strictly on identical terrain milestones (plane.near & plane.far fresh);
// canopy arrival timestamps are stamped passively inside the existing milestone polls (zero extra timers).
export const SHADMOT = {
  id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן',
  lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem',
}

export const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

export async function measureAppLand(context, serverUrl, { rate, dpr, dense, windy, panorama, releaseLand, fineTileFetches, assetDeadlines }) {
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
  await page.evaluate(() => { window.__perfCanopy = { t0: performance.now(), firstKey: null, firstAt: null, refKey: null, refAt: null } })

  // 1. First fallback canvas paint MUST composite fresh `plane.near` and `plane.far` (identical trigger on base & head).
  await page.waitForFunction((dense) => {
    const shown = window.__sceneStats?.shown
    const c = shown?.['canopy.near']
    if (c?.fresh && window.__perfCanopy && !window.__perfCanopy.firstAt) {
      window.__perfCanopy.firstKey = c.key; window.__perfCanopy.firstAt = performance.now()
    }
    return Boolean(document.querySelector('figure[data-canvas]') && window.__world?.terrain?.status === 'ready'
      && window.__world?.land && (!dense || window.__world.land.own.cover === 1)
      && shown?.['plane.near']?.fresh && shown?.['plane.far']?.fresh)
  }, dense, { timeout: 60000 })
  const firstFallbackPaintMs = performance.now() - tNav
  const fallbackSnap = await page.evaluate(() => ({
    albedoSource: window.__world.land.own.albedoSource,
    nearKey: window.__sceneStats.shown['plane.near'].key,
    farKey: window.__sceneStats.shown['plane.far'].key,
    canopyFirstKey: window.__perfCanopy?.firstKey ?? window.__sceneStats.shown['canopy.near']?.key ?? null,
    releaseT: (window.__perfCanopy.tRelease = performance.now()),
  }))

  // 2. Release delayed S2 + GIBS replies immediately at the terrain milestone; wait for refined terrain planes.
  const tRelease = performance.now()
  releaseLand()
  await page.waitForFunction(({ nearKey, farKey, canopyFirstKey }) => {
    const l = window.__world?.land
    const far20 = l?.rays?.[20]?.bands?.find((b) => b.distanceM === 20_000)?.sample
    const shown = window.__sceneStats?.shown
    const c = shown?.['canopy.near']
    if (c?.fresh && c.key !== canopyFirstKey && window.__perfCanopy && !window.__perfCanopy.refAt) {
      window.__perfCanopy.refKey = c.key; window.__perfCanopy.refAt = performance.now()
    }
    return Boolean(
      l?.own?.albedoSource?.startsWith('s2:2026-11-15')
      && far20?.ndviSource?.startsWith('gibs:') && far20?.albedoSource?.startsWith('gibs:2026-11-01')
      && shown?.['plane.near']?.fresh && shown['plane.near'].key !== nearKey
      && shown?.['plane.far']?.fresh && shown['plane.far'].key !== farKey,
    )
  }, { nearKey: fallbackSnap.nearKey, farKey: fallbackSnap.farKey, canopyFirstKey: fallbackSnap.canopyFirstKey }, { timeout: 60000 })
  const refinementMs = performance.now() - tRelease
  const refinedMeta = await page.evaluate(() => {
    const far20 = window.__world.land.rays[20].bands.find((b) => b.distanceM === 20_000)?.sample
    const far55 = window.__world.land.rays[20].bands.find((b) => b.distanceM >= 50_000)?.sample
    return {
      ownAlbedo: window.__world.land.own.albedoSource, ownCover: window.__world.land.own.coverSource,
      farNdvi: far20?.ndviSource, farAlbedo: far20?.albedoSource, farMissAlbedo: far55?.albedoSource,
      nearKey: window.__sceneStats.shown['plane.near'].key, farKey: window.__sceneStats.shown['plane.far'].key,
    }
  })

  // 3. Same-UTC-day hour scrub immediately after refined terrain (identical trigger on base & head; n=30).
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
    await page.waitForFunction(({ at, nearLight, farLight, nearForm, farForm, canopyFirstKey }) => {
      const s = window.__sceneStats?.shown
      const c = s?.['canopy.near']
      if (c?.fresh && c.key !== canopyFirstKey && window.__perfCanopy && !window.__perfCanopy.refAt) {
        window.__perfCanopy.refKey = c.key; window.__perfCanopy.refAt = performance.now()
      }
      return window.__world?.at !== at
        && s?.['plane.near']?.fresh && s['plane.near'].key === nearForm && s['plane.near'].lightKey !== nearLight
        && s?.['plane.far']?.fresh && s['plane.far'].key === farForm && s['plane.far'].lightKey !== farLight
    }, { ...prev, nearForm: refinedMeta.nearKey, farForm: refinedMeta.farKey, canopyFirstKey: fallbackSnap.canopyFirstKey }, { timeout: 15000 })
    scrubSteps.push(performance.now() - t0)
    const ok = await page.evaluate(({ nearForm, farForm }) => ({
      land: window.__world.land === window.__landRef0,
      form: window.__sceneStats.shown['plane.near']?.key === nearForm && window.__sceneStats.shown['plane.far']?.key === farForm,
    }), { nearForm: refinedMeta.nearKey, farForm: refinedMeta.farKey })
    if (!ok.land) reused = false
    if (!ok.form) formReused = false
  }

  const { cover, firstCanopyPaintMs, refinementCanopyMs } = await page.evaluate(() => {
    const p = window.__perfCanopy
    return {
      cover: window.__world.land.own.cover,
      firstCanopyPaintMs: p?.firstAt ? p.firstAt - p.t0 : null,
      refinementCanopyMs: p?.refAt ? p.refAt - p.tRelease : null,
    }
  })
  const duplicateTiles = [...fineTileFetches.entries()].filter(([, n]) => n > 1)
  const scrubMedianMs = median(scrubSteps)
  logAppLandReport({ rate, dpr, dense, windy, firstFallbackPaintMs, firstCanopyPaintMs, refinementMs, refinementCanopyMs,
    scrubMedianMs, scrubCount: scrubSteps.length, reused, formReused, fallbackSnap, refinedMeta, fineTileFetches, duplicateTiles })
  const problems = collectProblems({ dense, cover, fallbackSnap, refinedMeta, reused, formReused, duplicateTiles, assetDeadlines })
  return { firstFallbackPaintMs, firstCanopyPaintMs, refinementMs, refinementCanopyMs, scrubMedianMs, reused, duplicateTiles, problems }
}

function logAppLandReport(r) {
  const tag = [r.dense && 'dense tree cover', r.windy && 'windy animated canopy'].filter(Boolean).join(', ')
  const c0 = r.firstCanopyPaintMs === null ? '' : `, firstCanopy=${r.firstCanopyPaintMs.toFixed(1)} ms`
  const c1 = r.refinementCanopyMs === null ? '' : `, refCanopy=${r.refinementCanopyMs.toFixed(1)} ms`
  console.log(`\napp living-land mount (shadmot-mehola${tag ? `, ${tag}` : ''}, CPU ×${r.rate}, dpr ${r.dpr}, 100×100 S2 + 60×60 GIBS NDVI+SR intercepted)`)
  console.log(`  firstFallbackPaint ${r.firstFallbackPaintMs.toFixed(1)} ms  (albedoSource=${r.fallbackSnap.albedoSource}, plane.near=${r.fallbackSnap.nearKey}${c0}, satellite held)`)
  console.log(`  refinement         ${r.refinementMs.toFixed(1)} ms  (own=${r.refinedMeta.ownAlbedo}, cover=${r.refinedMeta.ownCover}, far20km ndvi=${r.refinedMeta.farNdvi} albedo=${r.refinedMeta.farAlbedo}, far55km(miss)=${r.refinedMeta.farMissAlbedo}, plane.near=${r.refinedMeta.nearKey}, plane.far=${r.refinedMeta.farKey}${c1})`)
  console.log(`  sameDayScrubLight  p50 ${r.scrubMedianMs.toFixed(1)} ms  (n=${r.scrubCount}, world.land reused=${r.reused}, form reused=${r.formReused})`)
  console.log(`  coldFineTiles      ${r.fineTileFetches.size} unique tiles fetched, duplicates=${r.duplicateTiles.length}`)
}

function collectProblems({ dense, cover, fallbackSnap, refinedMeta, reused, formReused, duplicateTiles, assetDeadlines }) {
  const problems = []
  if (assetDeadlines.size) problems.push(`local land asset deadline aborts: ${[...assetDeadlines].sort().join(', ')}`)
  if (dense && cover !== 1) problems.push(`dense fixture resolved to cover=${cover} (expected 1)`)
  if (fallbackSnap.albedoSource !== 'climatology') problems.push(`first paint albedoSource=${fallbackSnap.albedoSource} (expected climatology)`)
  if (!refinedMeta.farAlbedo?.startsWith('gibs:2026-11-01')) problems.push(`far albedoSource=${refinedMeta.farAlbedo} (expected gibs:2026-11-01*)`)
  const expectedMiss = dense ? 'climatology' : 's2-mean:2026-11-15+climatology'
  if (!assetDeadlines.size && refinedMeta.farMissAlbedo !== expectedMiss) {
    problems.push(`missing-tile far55km albedoSource=${refinedMeta.farMissAlbedo} (expected ${expectedMiss})`)
  }
  if (refinedMeta.nearKey === fallbackSnap.nearKey) problems.push('plane.near form key did not update on refinement')
  if (refinedMeta.farKey === fallbackSnap.farKey) problems.push('plane.far form key did not update on refinement')
  if (!reused) problems.push('same-day scrub rebuilt world.land')
  if (!formReused) problems.push('same-day scrub repainted plane form')
  const unexplained = duplicateTiles.filter(([k]) => !assetDeadlines.has(`/data/land/il/${k}`))
  if (unexplained.length) problems.push(`duplicate cold fine-tile fetches: ${unexplained.map(([k, n]) => `${k}×${n}`).join(', ')}`)
  return problems
}
