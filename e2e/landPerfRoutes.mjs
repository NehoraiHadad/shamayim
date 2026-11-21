import fs from 'node:fs'
import path from 'node:path'
import { root } from './harness.mjs'
import { buildGibsNdviPng, buildRecordedS2Fixture, fulfillRange, loadGibsSrJpeg } from './landFixtures.mjs'

/** Every external request on the benchmark page is intercepted or refused. */
export async function interceptLandPerf(browser, serverUrl, { dpr, dense, panorama }) {
  const host = new URL(serverUrl).host
  const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
  forecast.elevation = JSON.parse(panorama).groundM
  const [{ stac, cogs }, gibsPng, gibsSrJpg] = await Promise.all([
    buildRecordedS2Fixture(root), Promise.resolve(buildGibsNdviPng(root)), Promise.resolve(loadGibsSrJpeg(root)),
  ])

  let releaseLand
  const landGate = new Promise((r) => { releaseLand = r })
  const fineTileFetches = new Map()
  // Uniform tree cover in Shadmot's own 0.1° tile, keeping the surrounding observed cover and the same DEM and imagery.
  // Local tiles encode runs as a cover letter followed by a decimal count (b = tree cover).
  const denseTile = JSON.stringify({ v: 1, r: 'b40000' })
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
        if (dense && key === '323_355.json') return route.fulfill({ status: 200, contentType: 'application/json', body: denseTile })
      }
      return route.continue()
    }
    return route.abort('blockedbyclient')
  })

  return { context, releaseLand, fineTileFetches }
}
