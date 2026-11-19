// The app's valley, SVG scene against canvas scene (`?canvas=1`), side by side, for review (docs/design/qa/canvas/<stage>/).
//   node e2e/scene.compare.mjs <out.png> <place>@<HH:MM> … [--dpr=2]
// The app itself on the Vite dev server: the place and its recorded panorama put in storage as the app keeps them, the
// clock set to the moment (2026-11-17, the fixture's day), the forecast answered from the fixture at the place's own
// height (as the scene harness does); every other request
// off the dev server is refused. Each row: the scene figure with the sky above it, SVG on the left, canvas on the right.
import fs from 'node:fs'
import path from 'node:path'
import { launch, openPage, root, startServer } from './harness.mjs'

const args = process.argv.slice(2)
const dpr = Number(args.find((a) => a.startsWith('--dpr='))?.slice(6) ?? 2)
const [out, ...moments] = args.filter((a) => !a.startsWith('--'))
if (!out || !moments.length) {
  console.log('usage: node e2e/scene.compare.mjs <out.png> <place>@<HH:MM> … [--dpr=2]')
  process.exit(2)
}
const placesSrc = fs.readFileSync(path.join(root, 'src/test/scenePlaces.ts'), 'utf8')
const placeOf = (id) => {
  const m = placesSrc.match(new RegExp(`\\{ id: '${id}'[\\s\\S]*?\\}`))
  if (!m) throw new Error(`unknown place ${id}`)
  return Function(`return (${m[0]})`)()
}

const server = await startServer()
const browser = await launch()
const shots = []
try {
  for (const moment of moments) {
    const [id, hour] = moment.split('@')
    const place = placeOf(id)
    const panorama = fs.readFileSync(path.join(root, `src/test/fixtures/scene/${id}.panorama.json`), 'utf8')
    const at = `2026-11-17T${hour}:00+02:00`
    for (const canvas of [false, true]) {
      const { context, page } = await openPage(browser, server.url, dpr)
      // The recorded forecast with the place's own height (the panorama's ground), as Open-Meteo answers for the place.
      const forecast = JSON.parse(fs.readFileSync(path.join(root, 'src/test/fixtures/forecast-layers-2026-11-17.json'), 'utf8'))
      forecast.elevation = JSON.parse(panorama).groundM
      await context.route(/\/v1\/forecast/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(forecast) }))
      await page.addInitScript(({ place, panorama, id, at }) => {
        localStorage.setItem('shamayim:place:v1', JSON.stringify(place))
        localStorage.setItem(`shamayim:horizon:v3:${id}`, panorama)
        const R = Date, off = R.parse(at) - R.now()
        class S extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])) } static now() { return R.now() + off } }
        window.Date = S
      }, { place, panorama, id, at })
      await page.goto(`${server.url}/${canvas ? '?canvas=1' : ''}`)
      await page.waitForSelector('figure[data-scene]', { timeout: 60000 })
      await page.waitForTimeout(3500)
      const box = await page.locator('figure[data-scene]').boundingBox()
      const top = Math.max(0, box.y - 160)
      shots.push({ id, hour, canvas, png: await page.screenshot({ clip: { x: 0, y: top, width: 375, height: box.y + box.height - top } }) })
      await context.close()
    }
  }
  // One sheet: rows of moments, SVG | canvas, drawn in a page (no image library needed).
  const page = await (await browser.newContext({ deviceScaleFactor: dpr, viewport: { width: 2 * 375 + 24, height: 100 } })).newPage()
  const rows = moments.map((_, i) => [shots[2 * i], shots[2 * i + 1]])
  const html = `<body style="margin:0;background:#111;font:12px sans-serif;color:#ddd">${rows.map(([a, b]) =>
    `<div style="display:flex;gap:8px;padding:8px"><figure style="margin:0"><img src="data:image/png;base64,${a.png.toString('base64')}" style="width:375px;display:block"><figcaption>${a.id} ${a.hour} · SVG</figcaption></figure>`
    + `<figure style="margin:0"><img src="data:image/png;base64,${b.png.toString('base64')}" style="width:375px;display:block"><figcaption>${b.id} ${b.hour} · canvas</figcaption></figure></div>`).join('')}</body>`
  await page.setContent(html)
  await page.waitForTimeout(300)
  fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true })
  fs.writeFileSync(path.resolve(root, out), await page.screenshot({ fullPage: true }))
  console.log('saved', out)
} finally {
  await browser.close()
  await server.close()
}
