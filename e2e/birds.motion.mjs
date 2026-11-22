// Do the birds travel? The built app, live (its clock running from the moment, motion allowed, no scrub), shot once a
// second for `--secs` seconds; each flock is found as a cluster of what moved between consecutive shots and its centre
// followed. Prints, per flock, how far its centre went (px) and its speed (px/s), against the world's flocks.
//   node e2e/birds.motion.mjs <place>@<HH:MM> … [--secs=10] [--min=8]
// `--min`: the least travel (px over the run) a flock must make; any flock short of it fails (exit 1).
// Run `npm run build` first. Service worker blocked; the forecast from the fixture; every other host refused.
import fs from 'node:fs'
import path from 'node:path'
import { launch, root } from './harness.mjs'
import { findMarks, follow } from './birdMarks.mjs'

const args = process.argv.slice(2)
const opt = (name, fallback) => Number(args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback)
const secs = opt('secs', 10), least = opt('min', 8)
const moments = args.filter((a) => !a.startsWith('--'))
if (!moments.length) { console.log('usage: node e2e/birds.motion.mjs <place>@<HH:MM> … [--secs=10] [--min=8]'); process.exit(2) }
if (!fs.existsSync(path.join(root, 'dist/index.html'))) throw new Error('no dist/: run npm run build first')
const placesSrc = fs.readFileSync(path.join(root, 'src/test/scenePlaces.ts'), 'utf8')
const placeOf = (id) => Function(`return (${placesSrc.match(new RegExp(`\\{ id: '${id}'[\\s\\S]*?\\}`))[0]})`)()

const { preview } = await import('vite')
const server = await preview({ root, logLevel: 'error', preview: { host: '127.0.0.1', port: 0, strictPort: false } })
const base = server.resolvedUrls.local[0].replace(/\/$/, '')
const browser = await launch()
let failed = 0, measured = 0
try {
  for (const moment of moments) {
    const [id, hour] = moment.split('@')
    const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
    const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
    forecast.elevation = JSON.parse(panorama).groundM
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2,
      reducedMotion: 'no-preference', serviceWorkers: 'block' })
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (/\/v1\/forecast$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) })
      return url.host === new URL(base).host ? route.continue() : route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    await page.addInitScript(({ place, panorama, id, at }) => {
      localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
      localStorage.setItem(`shamayim:horizon:v3:${id}`, panorama)
      const R = Date, off = R.parse(at) - R.now()
      class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
      window.Date = S
    }, { place: placeOf(id), panorama, id, at: `2026-11-17T${hour}:00+02:00` })
    await page.goto(`${base}/`)
    await page.waitForSelector('figure[data-canvas]', { timeout: 60000 })
    await page.waitForTimeout(4000)
    const box = await page.locator('figure[data-canvas]').boundingBox()
    const clip = { x: 0, y: box.y - 100, width: 375, height: box.height * 0.6 + 100 }
    // The world's flocks and where their first 30 s of samples project across the view (`domain/camera.ts` xOf).
    const world = await page.evaluate(() => {
      const w = window.__world, c = w?.camera
      const xOf = (az) => c.width / 2 + c.handed * c.pxPerDeg * ((((az - c.heading) % 360) + 540) % 360 - 180)
      return (w?.life?.birds ?? []).map((f) => {
        const xs = (f.samples ?? [f]).slice(0, 16).map((p) => xOf(p.azimuth))
        return { name: `${f.kind}×${f.count}@${Math.round(f.distanceM)}m`, x0: Math.min(...xs), x1: Math.max(...xs) }
      })
    })
    const flocks = world.map((f) => f.name)
    /** A followed cluster is a flock only if a world flock projects within 60 px of it across (anything else: not a bird). */
    const flockOf = (tr) => world.find((f) => tr.every((p) => p.x >= f.x0 - 60 && p.x <= f.x1 + 60))
    const shots = []
    const t0 = Date.now()
    let last = await page.screenshot({ clip })
    for (let s = 1; s <= secs; s++) {
      await page.waitForTimeout(Math.max(0, t0 + s * 1000 - Date.now()))
      const shot = await page.screenshot({ clip })
      shots.push({ t: (Date.now() - t0) / 1000, marks: (await findMarks(page, last, shot)).map((m) => ({ ...m, x: m.x / 2, y: m.y / 2 })) })
      last = shot
    }
    const followed = follow(shots), tracks = followed.filter(flockOf)
    measured += tracks.length
    console.log(`${id}@${hour}  world flocks: ${flocks.join(', ') || 'none'}  clusters followed: ${followed.length}, matched to a flock: ${tracks.length}`)
    for (const tr of tracks) {
      const a = tr[0], b = tr[tr.length - 1], d = Math.hypot(b.x - a.x, b.y - a.y), v = d / Math.max(1e-6, b.t - a.t)
      const ok = d >= least
      if (!ok) failed++
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} (${a.x.toFixed(0)},${a.y.toFixed(0)}) → (${b.x.toFixed(0)},${b.y.toFixed(0)}) over ${(b.t - a.t).toFixed(1)} s:`
        + ` ${d.toFixed(1)} px, ${v.toFixed(2)} px/s (${flockOf(tr).name})  path ${tr.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(' ')}`)
    }
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
if (!measured) { console.log('no flock measured'); process.exit(1) }
if (failed) { console.log(`${failed} flock(s) travelled less than ${least} px`); process.exit(1) }
