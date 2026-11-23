// Offline observed-colour fallback -> refined still pair using recorded S2 + GIBS fixtures on the real App mount.
import fs from 'node:fs/promises'
import path from 'node:path'
import { root } from './harness.mjs'
import { interceptLandPerf } from './landPerfRoutes.mjs'

const SHADMOT = { id: 'shadmot-mehola', nameHe: 'שדמות מחולה', regionHe: 'בקעת הירדן', lat: 32.3465, lon: 35.5325, timezone: 'Asia/Jerusalem' }

const FIXTURE_PROVENANCE = {
  s2: {
    mode: 'tiled-crop-reconstruction',
    source: 'src/test/fixtures/land-s2-shadmot.json',
    item: 'S2B_36SYA_20261115_0_L2A',
    date: '2026-11-15',
    crop: '11x11',
    servedAs: '256x256 40 m UTM 36N GeoTIFFs',
  },
  gibsNdvi: {
    mode: 'tiled-crop-reconstruction',
    source: 'src/test/fixtures/land-gibs-ndvi.json',
    crop: '16x16',
    servedAs: '256x256 indexed PNG repeated at every requested tile address',
  },
  gibsSr: {
    mode: 'exact-recorded-tile',
    source: 'src/test/fixtures/land-gibs-sr-2026-11-01.jpg',
    tile: '8/103/153',
    date: '2026-11-01',
    otherTiles: '404',
  },
  note: 'Sentinel-2 and GIBS NDVI are tiled reconstructions of recorded crops (NDVI repeated across tile addresses), verifying fixture-backed selection and refinement rather than geographic accuracy; GIBS SR is the exact recorded 8/103/153 tile.',
}

async function readSources(page) {
  return page.evaluate(() => {
    const l = window.__world.land
    const pick = (s) => s ? { albedo: s.albedoSource, ndvi: s.ndviSource, cover: s.coverSource } : null
    const bandAt = (m) => l.rays[20]?.bands?.find((b) => b.distanceM >= m)?.sample
    return { date: l.date, own: pick(l.own), far20km: pick(bandAt(20_000)), far55km: pick(bandAt(50_000)) }
  })
}

export async function captureObservedPair(browser, serverUrl, outDir) {
  const dir = path.join(outDir, 'observed')
  await fs.mkdir(dir, { recursive: true })
  const panorama = await fs.readFile(path.join(root, 'src/test/fixtures/scene/shadmot-mehola.panorama.json'), 'utf8')
  const { context, releaseLand } = await interceptLandPerf(browser, serverUrl, { dpr: 1, dense: false, windy: false, panorama })
  try {
    const page = await context.newPage()
    await page.addInitScript(({ place, panorama, at }) => {
      window.__trackSceneShown = true
      localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
      localStorage.setItem(`shamayim:horizon:v3:${place.id}`, panorama)
      const R = Date, off = R.parse(at) - R.now()
      class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
      window.Date = S
    }, { place: SHADMOT, panorama, at: '2026-11-17T12:00:00+02:00' })
    await page.goto(`${serverUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(() => {
      const s = window.__sceneStats?.shown
      return Boolean(document.querySelector('figure[data-canvas]') && window.__world?.terrain?.status === 'ready'
        && window.__world?.land?.own?.albedoSource === 'climatology'
        && s?.['plane.near']?.fresh && s?.['plane.far']?.fresh && s?.['canopy.near']?.fresh)
    }, null, { timeout: 60000 })
    await page.evaluate(() => document.fonts.ready)
    const clip = await page.evaluate(() => {
      const r = document.querySelector('figure[data-canvas]').getBoundingClientRect()
      return { x: 0, y: 0, width: 375, height: Math.round(r.bottom) }
    })
    const keys0 = await page.evaluate(() => ({
      near: window.__sceneStats.shown['plane.near'].key,
      far: window.__sceneStats.shown['plane.far'].key,
      canopy: window.__sceneStats.shown['canopy.near']?.key ?? null,
    }))
    const fallbackSrc = await readSources(page)
    const fallbackPng = await page.screenshot({ clip, animations: 'disabled' })
    await fs.writeFile(path.join(dir, 'shadmot-fallback.png'), fallbackPng)

    releaseLand()
    await page.waitForFunction(({ near, far, canopy }) => {
      const l = window.__world?.land
      const far20 = l?.rays?.[20]?.bands?.find((b) => b.distanceM === 20_000)?.sample
      const s = window.__sceneStats?.shown
      return Boolean(l?.own?.albedoSource?.startsWith('s2:2026-11-15')
        && far20?.ndviSource?.startsWith('gibs:') && far20?.albedoSource?.startsWith('gibs:2026-11-01')
        && s?.['plane.near']?.fresh && s['plane.near'].key !== near
        && s?.['plane.far']?.fresh && s['plane.far'].key !== far
        && (!canopy || (s?.['canopy.near']?.fresh && s['canopy.near'].key !== canopy)))
    }, keys0, { timeout: 60000 })
    const refinedSrc = await readSources(page)
    const refinedPng = await page.screenshot({ clip, animations: 'disabled' })
    if (Buffer.compare(fallbackPng, refinedPng) === 0) throw new Error('observed refined still is pixel-identical to fallback')
    await fs.writeFile(path.join(dir, 'shadmot-refined.png'), refinedPng)
    const meta = { place: 'shadmot-mehola', at: '2026-11-17T12:00+02:00', clip, fixtures: FIXTURE_PROVENANCE, fallback: fallbackSrc, refined: refinedSrc }
    await fs.writeFile(path.join(dir, 'sources.json'), JSON.stringify(meta, null, 2) + '\n')
    await buildObservedSheet(page, outDir, fallbackPng, refinedPng, meta)
    console.log('captured observed fallback -> refined pair', JSON.stringify({ fallback: fallbackSrc, refined: refinedSrc }))
    return meta
  } finally {
    await context.close()
  }
}

async function buildObservedSheet(page, outDir, fallbackPng, refinedPng, meta) {
  const sheetPage = await page.context().newPage()
  try {
    await sheetPage.setContent('<!doctype html><meta charset="utf-8">')
    const png = await sheetPage.evaluate(async ({ fbB64, rfB64, meta }) => {
      const load = (b64) => new Promise((res, rej) => {
        const img = new Image(); img.onload = () => res(img); img.onerror = rej
        img.src = `data:image/png;base64,${b64}`
      })
      const [fb, rf] = await Promise.all([load(fbB64), load(rfB64)])
      const cropY = Math.max(0, fb.height - 190), w = fb.width, h = fb.height - cropY
      const gap = 12, head = 64, colCap = 48
      const canvas = document.createElement('canvas')
      canvas.width = 2 * w + 3 * gap
      canvas.height = head + colCap + h + gap
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#f2efe8'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1f2328'; ctx.font = 'bold 15px sans-serif'
      ctx.fillText('Observed satellite refinement (fixture-backed) — Shadmot Mehola (2026-11-17, 12:00)', gap, 21)
      ctx.fillStyle = '#57606a'; ctx.font = '11px sans-serif'
      ctx.fillText('reconstructed S2 (11×11 crop tiled, 2026-11-15) + reconstructed GIBS NDVI (16×16 crop repeated across tile addresses)', gap, 38)
      ctx.fillText('exact recorded GIBS SR tile 8/103/153 (2026-11-01; 404 elsewhere) · verifies pipeline selection, not geographic accuracy · 375 px', gap, 53)
      const cols = [
        { tag: 'FALLBACK (climatology)', color: '#6e7781', img: fb, src: meta.fallback },
        { tag: 'REFINED (reconstructed S2/NDVI + exact GIBS SR)', color: '#1a5d2e', img: rf, src: meta.refined },
      ]
      cols.forEach((col, i) => {
        const x = gap + i * (w + gap)
        ctx.fillStyle = col.color; ctx.font = 'bold 12px sans-serif'
        ctx.fillText(col.tag, x, head + 13)
        ctx.fillStyle = '#24292f'; ctx.font = '10.5px sans-serif'
        ctx.fillText(`near: albedo=${col.src.own.albedo} · ndvi=${col.src.own.ndvi}`, x, head + 28)
        ctx.fillStyle = '#57606a'; ctx.font = '10.5px sans-serif'
        ctx.fillText(`far 20 km: ${col.src.far20km.albedo} · 55 km: ${col.src.far55km.albedo}`, x, head + 42)
        ctx.drawImage(col.img, 0, cropY, w, h, x, head + colCap, w, h)
      })
      return canvas.toDataURL('image/png').split(',')[1]
    }, { fbB64: fallbackPng.toString('base64'), rfB64: refinedPng.toString('base64'), meta })
    await fs.writeFile(path.join(outDir, 'sheet-observed.png'), Buffer.from(png, 'base64'))
    console.log(`wrote ${path.relative(root, path.join(outDir, 'sheet-observed.png'))}`)
  } finally {
    await sheetPage.close()
  }
}
